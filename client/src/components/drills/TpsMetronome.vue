<template>
  <div class="drill tps">
    <header class="drill-head">
      <div>
        <h2>TPS Metronome</h2>
        <p class="subtitle">Build turn speed and rhythm — execute one move per beat and push the tempo up.</p>
      </div>
    </header>

    <div class="controls">
      <div class="tps-set">
        <label>Target speed</label>
        <input type="range" min="1" max="12" step="0.5" v-model.number="tps" />
        <div class="tps-readout">
          <span class="tps-num">{{ tps.toFixed(1) }}</span> TPS
          <span class="bpm">· {{ Math.round(tps * 60) }} BPM</span>
        </div>
      </div>
      <div class="toggles">
        <label class="check"><input type="checkbox" v-model="sound" /> Click</label>
        <label class="check"><input type="checkbox" v-model="moveStream" /> Move stream</label>
      </div>
    </div>

    <div class="beat-area" :class="{ active: running }">
      <div class="beat-dot" :class="{ pulse: pulseOn }"></div>
      <div v-if="moveStream" class="move-display">{{ running ? currentMove : '—' }}</div>
      <div v-else class="beat-count">{{ running ? beatCount : 'ready' }}</div>
    </div>

    <div class="actions">
      <button class="primary big" @click="toggle">{{ running ? 'Stop' : 'Start' }}</button>
      <p class="hint">Press <kbd>Space</kbd> to start/stop</p>
    </div>

    <div class="tap">
      <button class="ghost" @click="tap">Tap tempo</button>
      <span v-if="tappedTps" class="tap-readout">{{ tappedTps.toFixed(1) }} TPS</span>
      <button v-if="tappedTps" class="ghost small" @click="applyTap">Use as target</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

const STORE_KEY = 'drills.tps'

const MOVES = ["R", "R'", "U", "U'", "L", "L'", "F", "F'", "D", "D'", "B", "B'"]

const loadTps = (): number => {
  const raw = Number(localStorage.getItem(STORE_KEY))
  return raw >= 1 && raw <= 12 ? raw : 4
}

const tps = ref<number>(loadTps())
const sound = ref(true)
const moveStream = ref(true)
const running = ref(false)
const pulseOn = ref(false)
const beatCount = ref(0)
const currentMove = ref('R')

let interval: number | null = null
let audioCtx: AudioContext | null = null

watch(tps, (v) => {
  localStorage.setItem(STORE_KEY, String(v))
  if (running.value) restart()
})

const click = () => {
  if (!sound.value) return
  try {
    audioCtx ??= new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.frequency.value = 1500
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.06)
  } catch { /* audio unavailable */ }
}

const nextMove = () => {
  let m = MOVES[Math.floor(Math.random() * MOVES.length)]!
  let guard = 0
  // Avoid repeating the same face twice in a row.
  while (m[0] === currentMove.value[0] && guard < 10) {
    m = MOVES[Math.floor(Math.random() * MOVES.length)]!
    guard++
  }
  currentMove.value = m
}

const tick = () => {
  beatCount.value++
  if (moveStream.value) nextMove()
  click()
  pulseOn.value = false
  // Retrigger the pulse animation on the next frame.
  requestAnimationFrame(() => { pulseOn.value = true })
}

const start = () => {
  running.value = true
  beatCount.value = 0
  tick()
  interval = window.setInterval(tick, 1000 / tps.value)
}

const stop = () => {
  running.value = false
  pulseOn.value = false
  if (interval) { clearInterval(interval); interval = null }
}

const restart = () => { stop(); start() }
const toggle = () => (running.value ? stop() : start())

// --- Tap tempo ------------------------------------------------------------
const tapTimes = ref<number[]>([])
const tappedTps = ref<number | null>(null)
let tapResetTimer: number | null = null

const tap = () => {
  const now = performance.now()
  tapTimes.value.push(now)
  if (tapTimes.value.length > 6) tapTimes.value.shift()
  if (tapTimes.value.length >= 2) {
    const first = tapTimes.value[0]!
    const last = tapTimes.value[tapTimes.value.length - 1]!
    const avgInterval = (last - first) / (tapTimes.value.length - 1)
    tappedTps.value = Math.min(12, Math.max(1, 1000 / avgInterval))
  }
  // Reset the tap sequence after a pause.
  if (tapResetTimer) clearTimeout(tapResetTimer)
  tapResetTimer = window.setTimeout(() => { tapTimes.value = [] }, 2000)
}

const applyTap = () => {
  if (tappedTps.value) tps.value = Math.round(tappedTps.value * 2) / 2
}

const isTyping = () => document.activeElement instanceof HTMLInputElement
const handleKey = (e: KeyboardEvent) => {
  if (e.code !== 'Space' || e.repeat || isTyping()) return
  e.preventDefault()
  toggle()
}
window.addEventListener('keydown', handleKey)

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey)
  stop()
})
</script>

<style scoped>
.drill { max-width: 720px; margin: 0 auto; color: #1f2937; }
.drill-head h2 { margin: 0; font-size: 1.4rem; }
.subtitle { margin: 2px 0 0; color: #6b7280; font-size: 0.9rem; }

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  margin: 20px 0;
  padding: 16px 20px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}
.tps-set { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 240px; }
.tps-set label { font-size: 0.85rem; color: #6b7280; }
.tps-set input[type='range'] { width: 100%; accent-color: #2563eb; }
.tps-readout { font-size: 0.9rem; color: #6b7280; }
.tps-num { font-family: 'Courier New', monospace; font-weight: 700; font-size: 1.2rem; color: #1f2937; }
.bpm { color: #9ca3af; }

.toggles { display: flex; flex-direction: column; gap: 8px; }
.check { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; }

.beat-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  padding: 40px 0;
}
.beat-dot {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: #e5e7eb;
  transition: transform 0.05s;
}
.beat-area.active .beat-dot { background: #bfdbfe; }
.beat-dot.pulse { animation: beat 0.18s ease-out; }
@keyframes beat {
  0% { transform: scale(1.35); background: #2563eb; }
  100% { transform: scale(1); }
}

.move-display {
  font-family: 'Courier New', monospace;
  font-size: 3.4rem;
  font-weight: 700;
  min-height: 3.4rem;
  line-height: 1;
}
.beat-count { font-family: 'Courier New', monospace; font-size: 2rem; color: #9ca3af; }

.actions { text-align: center; }
.primary { border: none; background: #2563eb; color: white; border-radius: 8px; padding: 12px 32px; cursor: pointer; font-size: 1rem; }
.primary:hover { background: #1d4ed8; }
.hint { color: #9ca3af; font-size: 0.85rem; margin-top: 10px; }
kbd { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 4px; padding: 1px 6px; font-size: 0.8rem; }

.tap { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 24px; }
.ghost { border: 1px solid #d1d5db; background: white; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-size: 0.85rem; }
.ghost.small { padding: 6px 12px; font-size: 0.8rem; }
.ghost:hover { background: #f3f4f6; }
.tap-readout { font-family: 'Courier New', monospace; font-weight: 700; }
</style>
