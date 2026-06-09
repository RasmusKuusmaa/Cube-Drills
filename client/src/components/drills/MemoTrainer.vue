<template>
  <div class="drill memo">
    <header class="drill-head">
      <div>
        <h2>Memo Trainer</h2>
        <p class="subtitle">Train blindfolded memorization — memorize the letter sequence, then recall it.</p>
      </div>
    </header>

    <div class="settings" :class="{ locked: phase !== 'idle' }">
      <label>
        Targets
        <input type="number" v-model.number="length" min="2" max="60" :disabled="phase !== 'idle'" />
      </label>
      <div class="seg">
        <button :class="{ active: grouping === 'pairs' }" :disabled="phase !== 'idle'" @click="grouping = 'pairs'">Pairs</button>
        <button :class="{ active: grouping === 'singles' }" :disabled="phase !== 'idle'" @click="grouping = 'singles'">Singles</button>
      </div>
      <label class="check">
        <input type="checkbox" v-model="hideTimer" :disabled="phase !== 'idle'" />
        Hide memo timer
      </label>
    </div>

    <!-- Idle -->
    <div v-if="phase === 'idle'" class="stage">
      <button class="primary big" @click="start">Generate sequence</button>
      <p class="hint">Press <kbd>Space</kbd> to generate</p>
    </div>

    <!-- Memo -->
    <div v-else-if="phase === 'memo'" class="stage">
      <div class="memo-timer" v-if="!hideTimer">{{ (memoElapsed / 1000).toFixed(1) }}s</div>
      <div class="sequence">{{ groupedSequence }}</div>
      <button class="primary big" @click="beginRecall">Hide &amp; recall</button>
      <p class="hint">Memorize, then press <kbd>Space</kbd> to recall</p>
    </div>

    <!-- Recall -->
    <div v-else-if="phase === 'recall'" class="stage">
      <p class="recall-prompt">Type the sequence you memorized</p>
      <input
        ref="recallInput"
        v-model="userInput"
        class="recall-input"
        autocomplete="off"
        spellcheck="false"
        @keydown.enter="check"
      />
      <button class="primary big" @click="check">Check</button>
    </div>

    <!-- Result -->
    <div v-else class="stage">
      <div class="result-banner" :class="lastCorrect ? 'ok' : 'bad'">
        {{ lastCorrect ? 'Correct!' : 'Incorrect' }}
        <span v-if="lastMemoMs !== null" class="result-time">memo {{ (lastMemoMs / 1000).toFixed(1) }}s</span>
      </div>
      <div class="compare">
        <div class="compare-row">
          <span class="compare-label">You</span>
          <span class="compare-letters">
            <span v-for="(ch, i) in paddedInput" :key="'y' + i" :class="charClass(i)">{{ ch }}</span>
          </span>
        </div>
        <div class="compare-row">
          <span class="compare-label">Actual</span>
          <span class="compare-letters">
            <span v-for="(ch, i) in sequence" :key="'a' + i">{{ ch }}</span>
          </span>
        </div>
      </div>
      <button class="primary big" @click="start">Next</button>
      <p class="hint">Press <kbd>Space</kbd> for the next sequence</p>
    </div>

    <div class="stats-strip">
      <div class="stat"><span class="stat-val">{{ stats.attempts }}</span><span class="stat-key">attempts</span></div>
      <div class="stat"><span class="stat-val">{{ accuracy }}</span><span class="stat-key">accuracy</span></div>
      <div class="stat"><span class="stat-val">{{ stats.streak }}</span><span class="stat-key">streak</span></div>
      <div class="stat"><span class="stat-val">{{ stats.bestStreak }}</span><span class="stat-key">best streak</span></div>
      <div class="stat"><span class="stat-val">{{ bestMemo }}</span><span class="stat-key">best memo</span></div>
      <button class="reset" @click="resetStats" title="Reset stats">Reset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useGamification } from '@/composables/useGamification'

// Speffz lettering uses 24 stickers (A–X).
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWX'
const STORE_KEY = 'drills.memo'

type Phase = 'idle' | 'memo' | 'recall' | 'result'
type Stats = { attempts: number; correct: number; streak: number; bestStreak: number; bestMemoMs: number | null }

const loadStats = (): Stats => {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { attempts: 0, correct: 0, streak: 0, bestStreak: 0, bestMemoMs: null }
}

const length = ref(20)
const grouping = ref<'pairs' | 'singles'>('pairs')
const hideTimer = ref(false)

const phase = ref<Phase>('idle')
const sequence = ref<string[]>([])
const userInput = ref('')
const lastCorrect = ref(false)
const lastMemoMs = ref<number | null>(null)
const stats = ref<Stats>(loadStats())

const { trackMemo } = useGamification()

const recallInput = ref<HTMLInputElement | null>(null)
const memoElapsed = ref(0)
let memoStart = 0
let memoInterval: number | null = null

const persist = () => localStorage.setItem(STORE_KEY, JSON.stringify(stats.value))

const groupedSequence = computed(() => {
  if (grouping.value === 'singles') return sequence.value.join(' ')
  const out: string[] = []
  for (let i = 0; i < sequence.value.length; i += 2) out.push(sequence.value.slice(i, i + 2).join(''))
  return out.join(' ')
})

const paddedInput = computed(() => {
  const chars = userInput.value.toUpperCase().replace(/[^A-X]/g, '').split('')
  while (chars.length < sequence.value.length) chars.push('·')
  return chars
})

const charClass = (i: number) => {
  const guess = paddedInput.value[i]
  if (guess === '·') return 'miss'
  return guess === sequence.value[i] ? 'right' : 'wrong'
}

const accuracy = computed(() =>
  stats.value.attempts ? `${Math.round((stats.value.correct / stats.value.attempts) * 100)}%` : '—',
)
const bestMemo = computed(() =>
  stats.value.bestMemoMs === null ? '—' : `${(stats.value.bestMemoMs / 1000).toFixed(1)}s`,
)

const stopMemoTimer = () => {
  if (memoInterval) { clearInterval(memoInterval); memoInterval = null }
}

const start = () => {
  stopMemoTimer()
  const n = Math.max(2, Math.min(60, Math.floor(length.value) || 20))
  length.value = n
  sequence.value = Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]!)
  userInput.value = ''
  lastMemoMs.value = null
  phase.value = 'memo'
  memoElapsed.value = 0
  memoStart = performance.now()
  memoInterval = window.setInterval(() => { memoElapsed.value = performance.now() - memoStart }, 100)
}

const beginRecall = () => {
  stopMemoTimer()
  lastMemoMs.value = performance.now() - memoStart
  phase.value = 'recall'
  nextTick(() => recallInput.value?.focus())
}

const check = () => {
  const guess = userInput.value.toUpperCase().replace(/[^A-X]/g, '')
  const answer = sequence.value.join('')
  lastCorrect.value = guess === answer

  const s = stats.value
  s.attempts++
  if (lastCorrect.value) {
    s.correct++
    s.streak++
    s.bestStreak = Math.max(s.bestStreak, s.streak)
    if (lastMemoMs.value !== null && (s.bestMemoMs === null || lastMemoMs.value < s.bestMemoMs)) {
      s.bestMemoMs = lastMemoMs.value
    }
  } else {
    s.streak = 0
  }
  persist()
  trackMemo(lastCorrect.value)
  phase.value = 'result'
}

const resetStats = () => {
  if (!confirm('Reset memo trainer stats?')) return
  stats.value = { attempts: 0, correct: 0, streak: 0, bestStreak: 0, bestMemoMs: null }
  persist()
}

const isTyping = () => document.activeElement instanceof HTMLInputElement
const handleKey = (e: KeyboardEvent) => {
  if (e.code !== 'Space') return
  // In the recall phase the user is typing; don't hijack space.
  if (phase.value === 'recall' || (isTyping() && phase.value !== 'memo')) return
  e.preventDefault()
  if (phase.value === 'idle' || phase.value === 'result') start()
  else if (phase.value === 'memo') beginRecall()
}

onMounted(() => window.addEventListener('keydown', handleKey))
onUnmounted(() => { window.removeEventListener('keydown', handleKey); stopMemoTimer() })
</script>

<style scoped>
.drill { max-width: 760px; margin: 0 auto; color: #1f2937; }
.drill-head h2 { margin: 0; font-size: 1.4rem; }
.subtitle { margin: 2px 0 0; color: #6b7280; font-size: 0.9rem; }

.settings {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  margin: 18px 0;
  padding: 12px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}
.settings label { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
.settings input[type='number'] { width: 64px; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; }
.settings .check { gap: 6px; }

.seg { display: flex; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
.seg button { padding: 6px 14px; border: none; background: white; cursor: pointer; font-size: 0.85rem; border-right: 1px solid #e5e7eb; }
.seg button:last-child { border-right: none; }
.seg button.active { background: #2563eb; color: white; }

.stage {
  text-align: center;
  padding: 28px 16px;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.memo-timer { font-family: 'Courier New', monospace; font-size: 1.4rem; color: #6b7280; }
.sequence {
  font-family: 'Courier New', monospace;
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  word-spacing: 0.3em;
  line-height: 1.6;
  max-width: 680px;
}

.recall-prompt { color: #6b7280; margin: 0; }
.recall-input {
  font-family: 'Courier New', monospace;
  font-size: 1.4rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  width: 100%;
  max-width: 560px;
  text-align: center;
  padding: 12px;
  border: 2px solid #d1d5db;
  border-radius: 10px;
}
.recall-input:focus { outline: none; border-color: #2563eb; }

.result-banner {
  font-size: 1.2rem;
  font-weight: 700;
  display: inline-flex;
  align-items: baseline;
  gap: 12px;
}
.result-banner.ok { color: #16a34a; }
.result-banner.bad { color: #dc2626; }
.result-time { font-size: 0.85rem; font-weight: 500; color: #6b7280; }

.compare { display: flex; flex-direction: column; gap: 8px; }
.compare-row { display: flex; align-items: center; gap: 12px; }
.compare-label { width: 56px; text-align: right; color: #9ca3af; font-size: 0.8rem; }
.compare-letters {
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  letter-spacing: 0.18em;
  display: flex;
  flex-wrap: wrap;
}
.compare-letters .right { color: #16a34a; }
.compare-letters .wrong { color: #dc2626; background: #fee2e2; border-radius: 3px; }
.compare-letters .miss { color: #d1d5db; }

.primary {
  border: none;
  background: #2563eb;
  color: white;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 0.9rem;
}
.primary.big { padding: 12px 28px; font-size: 1rem; }
.primary:hover { background: #1d4ed8; }

.hint { color: #9ca3af; font-size: 0.85rem; margin: 0; }
kbd { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 4px; padding: 1px 6px; font-size: 0.8rem; }

.stats-strip {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
  border-top: 1px solid #e5e7eb;
  padding-top: 14px;
  margin-top: 10px;
}
.stat { display: flex; flex-direction: column; }
.stat-val { font-family: 'Courier New', monospace; font-weight: 700; font-size: 1.1rem; }
.stat-key { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: #9ca3af; }
.reset {
  margin-left: auto;
  border: 1px solid #fca5a5;
  color: #dc2626;
  background: white;
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.8rem;
}
</style>
