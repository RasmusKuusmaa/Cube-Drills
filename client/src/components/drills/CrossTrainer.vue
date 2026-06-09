<template>
  <div class="drill cross">
    <header class="drill-head">
      <div>
        <h2>Cross Trainer</h2>
        <p class="subtitle">Plan and execute the white cross. Solutions are move-optimal — beat them for efficiency.</p>
      </div>
      <div class="seg">
        <button
          v-for="d in difficulties"
          :key="d.key"
          :class="{ active: difficulty === d.key }"
          @click="setDifficulty(d.key)"
        >{{ d.label }}</button>
      </div>
    </header>

    <p class="orient-note">White on bottom · green in front</p>

    <div class="scramble-card">
      <div class="scramble-label">Scramble</div>
      <div class="scramble">{{ scramble }}</div>
    </div>

    <div class="timer-area" :class="timerClass">
      <div class="timer">{{ displayTime }}</div>
      <p class="hint" v-if="phase !== 'solving'">
        Hold <kbd>Space</kbd> to ready · release to start · tap to stop
      </p>
      <p class="hint" v-else>Solving… tap <kbd>Space</kbd> when the cross is done</p>
    </div>

    <div class="actions">
      <button class="ghost" @click="next">New scramble</button>
      <button class="ghost" v-if="!revealed" @click="revealed = true">Reveal optimal solution</button>
    </div>

    <div v-if="revealed" class="solution">
      <div class="solution-head">
        <span class="sol-name">Optimal cross</span>
        <span class="sol-count">{{ optimal.length }} move{{ optimal.length === 1 ? '' : 's' }}</span>
      </div>
      <div class="sol-moves">{{ optimal.moves.join(' ') || 'already solved' }}</div>
    </div>

    <div class="stats-strip">
      <div class="stat"><span class="stat-val">{{ stats.times.length }}</span><span class="stat-key">solves</span></div>
      <div class="stat"><span class="stat-val">{{ fmt(best) }}</span><span class="stat-key">best</span></div>
      <div class="stat"><span class="stat-val">{{ fmt(mean) }}</span><span class="stat-key">mean (12)</span></div>
      <div class="stat"><span class="stat-val">{{ avgOptimal }}</span><span class="stat-key">avg optimal</span></div>
      <button class="reset" @click="resetStats" title="Reset stats">Reset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useScramble } from '@/composables/useScramble'
import { useTimer } from '@/composables/useTimer'
import { useGamification } from '@/composables/useGamification'
import { solveCross, type CrossSolution } from '@/utils/crossSolver'
import { formatMs } from '@/utils/solves'

const STORE_KEY = 'drills.cross'
type DiffKey = 'any' | 'easy' | 'medium' | 'hard'
const difficulties: { key: DiffKey; label: string; test: (n: number) => boolean }[] = [
  { key: 'any', label: 'Any', test: () => true },
  { key: 'easy', label: 'Easy', test: (n) => n <= 4 },
  { key: 'medium', label: 'Medium', test: (n) => n === 5 || n === 6 },
  { key: 'hard', label: 'Hard', test: (n) => n >= 7 },
]

type Stats = { times: number[]; optimalSum: number; optimalCount: number }
const loadStats = (): Stats => {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { times: [], optimalSum: 0, optimalCount: 0 }
}

const { scramble, generateScramble } = useScramble('3x3')
const { trackCross } = useGamification()
const difficulty = ref<DiffKey>('any')
const optimal = ref<CrossSolution>({ moves: [], length: 0 })
const revealed = ref(false)
const phase = ref<'idle' | 'solving'>('idle')
const stats = ref<Stats>(loadStats())

const persist = () => localStorage.setItem(STORE_KEY, JSON.stringify(stats.value))
const fmt = (ms: number | null) => formatMs(ms)

const newScramble = () => {
  const diff = difficulties.find((d) => d.key === difficulty.value)!
  let scr = ''
  let sol: CrossSolution = { moves: [], length: 0 }
  // Regenerate until the optimal cross length matches the chosen difficulty.
  for (let i = 0; i < 200; i++) {
    scr = generateScramble('3x3')
    sol = solveCross(scr)
    if (diff.test(sol.length)) break
  }
  optimal.value = sol
}

const { displayTime, timerClass, startTimer, startHold, releaseHold } = useTimer({
  onFinish: (time) => {
    stats.value.times = [time, ...stats.value.times].slice(0, 100)
    stats.value.optimalSum += optimal.value.length
    stats.value.optimalCount++
    persist()
    trackCross(time)
    phase.value = 'idle'
    revealed.value = false
    newScramble()
  },
})

const next = () => {
  revealed.value = false
  newScramble()
}

const best = computed(() => (stats.value.times.length ? Math.min(...stats.value.times) : null))
const mean = computed(() => {
  const recent = stats.value.times.slice(0, 12)
  if (recent.length === 0) return null
  return recent.reduce((a, t) => a + t, 0) / recent.length
})
const avgOptimal = computed(() =>
  stats.value.optimalCount ? (stats.value.optimalSum / stats.value.optimalCount).toFixed(1) : '—',
)

const setDifficulty = (key: DiffKey) => {
  difficulty.value = key
  next()
}

const resetStats = () => {
  if (!confirm('Reset cross trainer stats?')) return
  stats.value = { times: [], optimalSum: 0, optimalCount: 0 }
  persist()
}

const isTyping = () => document.activeElement instanceof HTMLInputElement
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code !== 'Space' || e.repeat || isTyping()) return
  e.preventDefault()
  startHold(() => {})
}
const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code !== 'Space' || isTyping()) return
  e.preventDefault()
  releaseHold(() => {
    phase.value = 'solving'
    startTimer()
  })
}

onMounted(() => {
  newScramble()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<style scoped>
.drill { max-width: 760px; margin: 0 auto; color: #1f2937; }
.drill-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.drill-head h2 { margin: 0; font-size: 1.4rem; }
.subtitle { margin: 2px 0 0; color: #6b7280; font-size: 0.9rem; max-width: 460px; }

.seg { display: flex; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
.seg button { padding: 6px 12px; border: none; background: white; cursor: pointer; font-size: 0.82rem; border-right: 1px solid #e5e7eb; }
.seg button:last-child { border-right: none; }
.seg button.active { background: #2563eb; color: white; }

.orient-note { color: #9ca3af; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; margin: 14px 0 6px; }

.scramble-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; text-align: center; }
.scramble-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 8px; }
.scramble { font-family: 'Courier New', monospace; font-size: 1.35rem; font-weight: 600; word-spacing: 0.18em; }

.timer-area { text-align: center; padding: 26px 0 8px; }
.timer { font-size: 4rem; font-weight: 700; font-family: 'Courier New', monospace; line-height: 1; user-select: none; }
.timer-area.early .timer { color: #dc2626; }
.timer-area.ready .timer { color: #16a34a; }
.hint { color: #9ca3af; font-size: 0.85rem; margin-top: 8px; }
kbd { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 4px; padding: 1px 6px; font-size: 0.8rem; }

.actions { display: flex; justify-content: center; gap: 10px; margin: 8px 0 4px; }
.ghost { border: 1px solid #d1d5db; background: white; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-size: 0.85rem; }
.ghost:hover { background: #f3f4f6; }

.solution { margin: 14px auto 0; max-width: 560px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; text-align: center; }
.solution-head { display: flex; justify-content: center; gap: 12px; align-items: baseline; margin-bottom: 6px; }
.sol-name { font-weight: 700; font-size: 0.9rem; }
.sol-count { font-size: 0.8rem; color: #2563eb; }
.sol-moves { font-family: 'Courier New', monospace; font-size: 1.2rem; color: #1d4ed8; word-spacing: 0.18em; }

.stats-strip { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; border-top: 1px solid #e5e7eb; padding-top: 14px; margin-top: 18px; }
.stat { display: flex; flex-direction: column; }
.stat-val { font-family: 'Courier New', monospace; font-weight: 700; font-size: 1.1rem; }
.stat-key { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: #9ca3af; }
.reset { margin-left: auto; border: 1px solid #fca5a5; color: #dc2626; background: white; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 0.8rem; }
</style>
