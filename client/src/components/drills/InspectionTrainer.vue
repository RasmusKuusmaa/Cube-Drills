<template>
  <div class="drill inspection">
    <header class="drill-head">
      <div>
        <h2>Inspection Trainer</h2>
        <p class="subtitle">Practice the WCA 15-second inspection: plan, then go before the buzzer.</p>
      </div>
      <div class="head-controls">
        <select v-model="event" class="event-select">
          <option v-for="c in cubes" :key="c" :value="c">{{ c }}</option>
        </select>
        <label class="check"><input type="checkbox" v-model="sound" /> Sound</label>
      </div>
    </header>

    <div class="scramble-card">
      <div class="scramble-label">Scramble</div>
      <div class="scramble">{{ scramble }}</div>
    </div>

    <div class="stage" :class="stageClass">
      <template v-if="phase === 'inspecting'">
        <div class="count">{{ inspectionDisplay }}</div>
        <div class="penalty-tag" v-if="livePenalty">{{ livePenalty }}</div>
        <p class="hint">Hold <kbd>Space</kbd> to ready, release to start solving</p>
      </template>
      <template v-else-if="phase === 'solving'">
        <div class="count solve" :class="timerClass">{{ displayTime }}</div>
        <p class="hint">Tap <kbd>Space</kbd> to stop</p>
      </template>
      <template v-else-if="phase === 'done'">
        <div class="count result" :class="{ dnf: lastResult?.penalty === 'DNF' }">{{ resultText }}</div>
        <div class="result-meta">
          inspection {{ (lastResult!.inspectionMs / 1000).toFixed(1) }}s
          <span v-if="lastResult!.penalty !== 'OK'" class="pen">· {{ lastResult!.penalty }}</span>
        </div>
        <p class="hint">Press <kbd>Space</kbd> for the next scramble</p>
      </template>
      <template v-else>
        <div class="count idle">15.0</div>
        <p class="hint">Press <kbd>Space</kbd> to start inspection</p>
      </template>
    </div>

    <div class="stats-strip">
      <div class="stat"><span class="stat-val">{{ completed }}</span><span class="stat-key">solves</span></div>
      <div class="stat"><span class="stat-val">{{ fmt(best) }}</span><span class="stat-key">best</span></div>
      <div class="stat"><span class="stat-val">{{ fmt(mean) }}</span><span class="stat-key">mean (5)</span></div>
      <div class="stat"><span class="stat-val">{{ avgInspection }}</span><span class="stat-key">avg insp.</span></div>
      <div class="stat"><span class="stat-val">{{ penaltyRate }}</span><span class="stat-key">penalty rate</span></div>
      <button class="reset" @click="resetStats" title="Reset stats">Reset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useScramble } from '@/composables/useScramble'
import { useTimer } from '@/composables/useTimer'
import { useGamification } from '@/composables/useGamification'
import { formatMs, type Penalty } from '@/utils/solves'

const STORE_KEY = 'drills.inspection'
const cubes = ['3x3', '2x2', '4x4', '5x5', 'Megaminx', 'Pyraminx', 'Skewb', 'Square-1', 'Clock']

type Result = { time: number; inspectionMs: number; penalty: Penalty }
type Stats = { results: Result[] }
const loadStats = (): Stats => {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { results: [] }
}

const event = ref('3x3')
const sound = ref(true)
const phase = ref<'idle' | 'inspecting' | 'solving' | 'done'>('idle')
const stats = ref<Stats>(loadStats())
const lastResult = ref<Result | null>(null)

const { scramble, generateScramble } = useScramble('3x3')
const { trackInspection } = useGamification()
watch(event, (e) => { generateScramble(e); reset() })

// --- Inspection countdown -------------------------------------------------
const inspectionMs = ref(0)
let inspectStart = 0
let inspectInterval: number | null = null
const cuesPlayed = ref<Set<number>>(new Set())

const inspectionRemaining = computed(() => 15000 - inspectionMs.value)
const inspectionDisplay = computed(() => Math.max(0, inspectionRemaining.value / 1000).toFixed(1))
const livePenalty = computed(() => {
  if (inspectionMs.value > 17000) return 'DNF'
  if (inspectionMs.value > 15000) return '+2'
  return ''
})
const stageClass = computed(() => {
  if (phase.value !== 'inspecting') return ''
  if (inspectionMs.value > 15000) return 'over'
  if (inspectionMs.value > 12000) return 'warn2'
  if (inspectionMs.value > 8000) return 'warn1'
  return 'go'
})

let audioCtx: AudioContext | null = null
const beep = (freq: number) => {
  if (!sound.value) return
  try {
    audioCtx ??= new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.2)
  } catch { /* audio unavailable */ }
}

const stopInspection = () => {
  if (inspectInterval) { clearInterval(inspectInterval); inspectInterval = null }
}

const startInspection = () => {
  phase.value = 'inspecting'
  inspectionMs.value = 0
  inspectStart = performance.now()
  cuesPlayed.value = new Set()
  inspectInterval = window.setInterval(() => {
    inspectionMs.value = performance.now() - inspectStart
    // WCA judge cues: "8 seconds" and "12 seconds" elapsed.
    for (const cue of [8000, 12000]) {
      if (inspectionMs.value >= cue && !cuesPlayed.value.has(cue)) {
        cuesPlayed.value.add(cue)
        beep(cue === 8000 ? 660 : 880)
      }
    }
  }, 50)
}

const penaltyFor = (ms: number): Penalty => {
  if (ms > 17000) return 'DNF'
  if (ms > 15000) return '+2'
  return 'OK'
}

const { displayTime, timerClass, startTimer, startHold, releaseHold } = useTimer({
  onFinish: (time) => {
    const penalty = penaltyFor(lastInspectionAtStart)
    const result: Result = { time, inspectionMs: lastInspectionAtStart, penalty }
    lastResult.value = result
    stats.value.results = [result, ...stats.value.results].slice(0, 200)
    persist()
    trackInspection(time, penalty)
    phase.value = 'done'
  },
})

const fmt = (ms: number | null) => formatMs(ms)
const persist = () => localStorage.setItem(STORE_KEY, JSON.stringify(stats.value))

// --- Derived stats (penalties folded in) ----------------------------------
const effective = (r: Result): number =>
  r.penalty === 'DNF' ? Infinity : r.penalty === '+2' ? r.time + 2000 : r.time
const finite = computed(() => stats.value.results.map(effective).filter(Number.isFinite))
const completed = computed(() => stats.value.results.filter((r) => r.penalty !== 'DNF').length)
const best = computed(() => (finite.value.length ? Math.min(...finite.value) : null))
const mean = computed(() => {
  const recent = stats.value.results.slice(0, 5).map(effective)
  if (recent.length < 5 || recent.some((t) => !Number.isFinite(t))) return null
  return recent.reduce((a, t) => a + t, 0) / recent.length
})
const avgInspection = computed(() => {
  if (!stats.value.results.length) return '—'
  const sum = stats.value.results.reduce((a, r) => a + r.inspectionMs, 0)
  return `${(sum / stats.value.results.length / 1000).toFixed(1)}s`
})
const penaltyRate = computed(() => {
  const total = stats.value.results.length
  if (!total) return '—'
  const pen = stats.value.results.filter((r) => r.penalty !== 'OK').length
  return `${Math.round((pen / total) * 100)}%`
})

const resultText = computed(() => {
  if (!lastResult.value) return ''
  if (lastResult.value.penalty === 'DNF') return 'DNF'
  const base = (lastResult.value.time / 1000).toFixed(2)
  return lastResult.value.penalty === '+2' ? `${base}+` : base
})

let lastInspectionAtStart = 0

const reset = () => {
  stopInspection()
  phase.value = 'idle'
  inspectionMs.value = 0
}

const next = () => {
  generateScramble(event.value)
  reset()
}

const resetStats = () => {
  if (!confirm('Reset inspection trainer stats?')) return
  stats.value = { results: [] }
  persist()
}

// --- Spacebar flow --------------------------------------------------------
const isTyping = () => document.activeElement instanceof HTMLInputElement
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code !== 'Space' || e.repeat || isTyping()) return
  e.preventDefault()
  if (phase.value === 'idle') {
    startInspection()
  } else if (phase.value === 'inspecting') {
    startHold(() => {})
  } else if (phase.value === 'solving') {
    startHold(() => {}) // running -> stops the timer (fires onFinish)
  } else if (phase.value === 'done') {
    next()
  }
}
const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code !== 'Space' || isTyping()) return
  e.preventDefault()
  if (phase.value === 'inspecting') {
    releaseHold(() => {
      lastInspectionAtStart = performance.now() - inspectStart
      stopInspection()
      phase.value = 'solving'
      startTimer()
    })
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  stopInspection()
})
</script>

<style scoped>
.drill { max-width: 760px; margin: 0 auto; color: #1f2937; }
.drill-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.drill-head h2 { margin: 0; font-size: 1.4rem; }
.subtitle { margin: 2px 0 0; color: #6b7280; font-size: 0.9rem; max-width: 440px; }
.head-controls { display: flex; align-items: center; gap: 14px; }
.event-select { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 8px; }
.check { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: #6b7280; }

.scramble-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px; text-align: center; margin: 16px 0; }
.scramble-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 8px; }
.scramble { font-family: 'Courier New', monospace; font-size: 1.25rem; font-weight: 600; word-spacing: 0.18em; }

.stage {
  text-align: center;
  padding: 24px 0 12px;
  border-radius: 14px;
  transition: background 0.2s;
}
.stage.go { background: #f0fdf4; }
.stage.warn1 { background: #fefce8; }
.stage.warn2 { background: #fff7ed; }
.stage.over { background: #fef2f2; }

.count { font-size: 4.4rem; font-weight: 700; font-family: 'Courier New', monospace; line-height: 1; user-select: none; }
.stage.warn1 .count { color: #ca8a04; }
.stage.warn2 .count { color: #ea580c; }
.stage.over .count { color: #dc2626; }
.count.idle { color: #d1d5db; }
.count.solve.ready { color: #16a34a; }
.count.solve.early { color: #dc2626; }
.count.result.dnf { color: #dc2626; }

.penalty-tag { color: #dc2626; font-weight: 700; margin-top: 6px; }
.result-meta { color: #6b7280; font-size: 0.9rem; margin-top: 8px; }
.result-meta .pen { color: #dc2626; font-weight: 600; }

.hint { color: #9ca3af; font-size: 0.85rem; margin-top: 10px; }
kbd { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 4px; padding: 1px 6px; font-size: 0.8rem; }

.stats-strip { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; border-top: 1px solid #e5e7eb; padding-top: 14px; margin-top: 18px; }
.stat { display: flex; flex-direction: column; }
.stat-val { font-family: 'Courier New', monospace; font-weight: 700; font-size: 1.1rem; }
.stat-key { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: #9ca3af; }
.reset { margin-left: auto; border: 1px solid #fca5a5; color: #dc2626; background: white; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 0.8rem; }
</style>
