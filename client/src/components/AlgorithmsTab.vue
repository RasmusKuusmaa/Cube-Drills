<template>
  <div class="alg-tab">
    <header class="alg-header">
      <div>
        <h1>Algorithm Trainer</h1>
        <p class="subtitle">Drill PLL — apply the setup, execute the algorithm, beat your times.</p>
      </div>
      <div class="view-toggle">
        <button :class="{ active: view === 'train' }" @click="view = 'train'">Train</button>
        <button :class="{ active: view === 'speed' }" @click="view = 'speed'">Speed</button>
        <button :class="{ active: view === 'browse' }" @click="view = 'browse'">Browse</button>
      </div>
    </header>

    <!-- ===================== TRAIN ===================== -->
    <section v-if="view === 'train'" class="train">
      <div v-if="poolCases.length === 0" class="empty">
        No cases selected. Open <button class="link" @click="view = 'browse'">Browse</button> and pick
        some algorithms to practice.
      </div>

      <template v-else>
        <div class="train-bar">
          <span class="pool-count">{{ poolCases.length }} case{{ poolCases.length === 1 ? '' : 's' }} in pool</span>
          <label class="auf-toggle">
            <input type="checkbox" :checked="aufEnabled" @change="toggleAuf" />
            Random angle (AUF)
          </label>
        </div>

        <div class="case-display">
          <PllDiagram v-if="current" :alg="current.alg" :size="170" :key="current.id" />
          <div class="scramble-card">
            <div class="scramble-label">Set up on a real cube</div>
            <div class="scramble">{{ currentSetup || '—' }}</div>
          </div>
        </div>

        <div class="timer-area" :class="timerClass">
          <div class="timer">{{ displayTime }}</div>
          <p class="hint" v-if="!started">Hold <kbd>Space</kbd> to start · release to go · tap again to stop</p>
        </div>

        <div class="reveal">
          <button v-if="!peeked" class="ghost" @click="peeked = true">Reveal algorithm</button>
          <div v-else-if="current" class="reveal-content">
            <span class="reveal-name">{{ current.name }}</span>
            <span class="reveal-alg">{{ current.alg }}</span>
          </div>
        </div>

        <div v-if="history.length" class="history">
          <h2>This session</h2>
          <div class="session-summary">
            <span>{{ sessionTimes.length }} solves</span>
            <span>mean {{ fmt(sessionMean) }}</span>
            <span>best {{ fmt(sessionBest) }}</span>
          </div>
          <ul class="history-list">
            <li v-for="(h, i) in history" :key="i">
              <span class="h-name">{{ h.name }}</span>
              <span class="h-time">{{ formatMs(h.time) }}</span>
            </li>
          </ul>
        </div>
      </template>
    </section>

    <!-- ===================== SPEED ===================== -->
    <section v-else-if="view === 'speed'" class="speed">
      <div v-if="poolCases.length === 0" class="empty">
        No cases selected. Open <button class="link" @click="view = 'browse'">Browse</button> and pick
        some algorithms to drill.
      </div>

      <template v-else>
        <div class="train-bar">
          <label class="focus">
            Focus
            <select v-model.number="focusCount">
              <option :value="0">All cases</option>
              <option :value="3">Worst 3</option>
              <option :value="6">Worst 6</option>
              <option :value="9">Worst 9</option>
            </select>
          </label>
          <label class="auf-toggle">
            <input type="checkbox" :checked="aufEnabled" @change="toggleAuf" />
            Random angle (AUF)
          </label>
        </div>

        <div class="case-display">
          <PllDiagram v-if="current" :alg="current.alg" :size="170" :key="current.id" />
          <div class="scramble-card">
            <div class="scramble-label">Set up on a real cube</div>
            <div class="scramble">{{ currentSetup || '—' }}</div>
          </div>
        </div>

        <div class="timer-area" :class="timerClass">
          <div class="timer">{{ displayTime }}</div>
          <p class="hint" v-if="!started">Hold <kbd>Space</kbd> to start · release to go · tap again to stop</p>
        </div>

        <div class="reveal">
          <button v-if="!peeked" class="ghost" @click="peeked = true">Reveal algorithm</button>
          <div v-else-if="current" class="reveal-content">
            <span class="reveal-name">{{ current.name }}</span>
            <span class="reveal-alg">{{ current.alg }}</span>
          </div>
        </div>

        <div class="session-summary speed-session">
          <span>{{ sessionTimes.length }} solves</span>
          <span>ao12 {{ fmt(sessionAo12) }}</span>
          <span>mean {{ fmt(sessionMean) }}</span>
          <span>best {{ fmt(sessionBest) }}</span>
        </div>

        <div class="ranking">
          <div class="ranking-head">
            <h2>Weakness ranking</h2>
            <span class="ranking-sub">slowest first · your ao12 vs the case's target time</span>
          </div>
          <ul class="rank-list">
            <li
              v-for="(row, i) in ranking"
              :key="row.case.id"
              class="rank-row"
              :class="{ current: row.case.id === current?.id }"
            >
              <span class="rank-pos">{{ i + 1 }}</span>
              <span class="rank-name">{{ row.case.name }}</span>
              <span class="rank-bar"><span class="rank-bar-fill" :class="ratioClass(row.ratio)" :style="barStyle(row)"></span></span>
              <span class="rank-ratio" :class="ratioClass(row.ratio)">
                {{ row.ratio === null ? 'no data' : row.ratio.toFixed(2) + '×' }}
              </span>
              <span class="rank-times">
                <span class="rank-ao" :class="{ prov: row.metric.provisional }">{{
                  row.metric.value === null ? '--' : fmt(row.metric.value)
                }}</span>
                <span class="rank-par">/ {{ (row.par / 1000).toFixed(2) }}</span>
                <span class="rank-samples" :title="'solves recorded toward ao12'">{{ row.metric.samples }}/12</span>
              </span>
            </li>
          </ul>
        </div>
      </template>
    </section>

    <!-- ===================== BROWSE ===================== -->
    <section v-else class="browse">
      <div class="browse-toolbar">
        <div class="select-actions">
          <button @click="selectAll">All</button>
          <button @click="selectNone">None</button>
          <button @click="selectTwoLook">2-look</button>
        </div>
        <button class="danger" @click="confirmReset">Reset stats</button>
      </div>

      <div v-for="group in groupedCases" :key="group.name" class="group">
        <h2 class="group-title">{{ group.name }}</h2>
        <div class="case-grid">
          <div
            v-for="c in group.cases"
            :key="c.id"
            class="case-card"
            :class="{ disabled: !pool.has(c.id) }"
          >
            <label class="case-head">
              <input type="checkbox" :checked="pool.has(c.id)" @change="toggleCase(c.id)" />
              <span class="case-name">{{ c.name }}</span>
              <span v-if="c.twoLook" class="badge">2-look</span>
            </label>
            <div class="case-body">
              <PllDiagram :alg="c.alg" :size="76" :arrows="true" />
              <div class="case-alg">{{ c.alg }}</div>
            </div>
            <div class="case-stats">
              <span :title="'Attempts'">×{{ statFor(c.id)?.attempts ?? 0 }}</span>
              <span :title="'Best'">best {{ fmt(statFor(c.id)?.best ?? null) }}</span>
              <span :title="'Recent average (last 5)'">ao5 {{ fmt(caseAo5(c.id)) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useTimer } from '@/composables/useTimer'
import { useAlgTrainer, ao12Of, type RankRow } from '@/composables/useAlgTrainer'
import { algorithmsBySet, type Algorithm } from '@/data/algorithms'
import { formatMs } from '@/utils/solves'
import PllDiagram from './PllDiagram.vue'

const view = ref<'train' | 'speed' | 'browse'>('train')
const peeked = ref(false)
const started = ref(false)
const focusCount = ref(0)

type HistoryEntry = { name: string; time: number }
const history = ref<HistoryEntry[]>([])

const {
  poolCases,
  pool,
  current,
  currentSetup,
  aufEnabled,
  sessionTimes,
  ranking,
  pickNext,
  pickWeakest,
  recordTime,
  statFor,
  toggleCase,
  selectAll,
  selectNone,
  selectTwoLook,
  resetStats,
  toggleAuf,
} = useAlgTrainer('PLL')

// In Speed mode, restrict selection to the worst N when a focus is chosen.
const eligibleIds = computed(() =>
  focusCount.value ? ranking.value.slice(0, focusCount.value).map((r) => r.case.id) : undefined,
)

// Choose the next case with the picker appropriate to the active view.
const advance = () => {
  if (view.value === 'speed') pickWeakest(eligibleIds.value)
  else pickNext()
}

const { displayTime, timerClass, startTimer, startHold, releaseHold } = useTimer({
  onFinish: (time) => {
    if (current.value) {
      history.value = [{ name: current.value.name, time }, ...history.value].slice(0, 20)
      recordTime(time)
    }
    started.value = false
    peeked.value = false
    advance()
  },
})

// Jump to a weak case when entering Speed mode or changing the focus.
watch(view, (v) => {
  if (v === 'speed') pickWeakest(eligibleIds.value)
})
watch(focusCount, () => {
  if (view.value === 'speed') pickWeakest(eligibleIds.value)
})

const fmt = (ms: number | null) => formatMs(ms)

const sessionAo12 = computed(() => ao12Of(sessionTimes.value))

const ratioClass = (ratio: number | null) => {
  if (ratio === null) return 'na'
  if (ratio >= 1.5) return 'bad'
  if (ratio >= 1.2) return 'warn'
  return 'good'
}

// Bar fills from 0 (at target) toward full (≈2× target or worse).
const barStyle = (row: RankRow) => {
  if (row.ratio === null) return { width: '100%', opacity: '0.2' }
  const pct = Math.min(100, Math.max(4, (row.ratio - 1) * 100))
  return { width: `${pct}%` }
}

// Grouped list for the Browse view (uses the full set, not just the pool).
const groupedCases = computed(() => {
  const groups: { name: string; cases: Algorithm[] }[] = []
  for (const c of algorithmsBySet('PLL')) {
    let g = groups.find((x) => x.name === c.group)
    if (!g) {
      g = { name: c.group, cases: [] }
      groups.push(g)
    }
    g.cases.push(c)
  }
  return groups
})

const caseAo5 = (id: string): number | null => {
  const times = statFor(id)?.times ?? []
  if (times.length < 1) return null
  const recent = times.slice(0, 5)
  return recent.reduce((a, t) => a + t, 0) / recent.length
}

const sessionMean = computed(() => {
  if (sessionTimes.value.length === 0) return null
  return sessionTimes.value.reduce((a, t) => a + t, 0) / sessionTimes.value.length
})
const sessionBest = computed(() =>
  sessionTimes.value.length ? Math.min(...sessionTimes.value) : null,
)

const confirmReset = () => {
  if (confirm('Reset all algorithm training stats? This cannot be undone.')) {
    resetStats()
    history.value = []
  }
}

// --- Spacebar timing (ignored while typing in form fields) ---------------
const isTyping = () => {
  const el = document.activeElement
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
}

const isDrilling = () => view.value === 'train' || view.value === 'speed'

const handleKeyDown = (e: KeyboardEvent) => {
  if (!isDrilling() || poolCases.value.length === 0 || isTyping()) return
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault()
    started.value = true
    startHold(() => {})
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (!isDrilling() || isTyping()) return
  if (e.code === 'Space') {
    e.preventDefault()
    releaseHold(() => startTimer())
  }
}

onMounted(() => {
  if (!current.value) pickNext()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<style scoped>
.alg-tab {
  max-width: 1000px;
  margin: 0 auto;
  color: #1f2937;
  padding-bottom: 40px;
}

.alg-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.alg-header h1 {
  margin: 0;
  font-size: 1.6rem;
}

.subtitle {
  margin: 2px 0 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.view-toggle,
.select-actions {
  display: flex;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
}

.view-toggle button,
.select-actions button {
  padding: 8px 14px;
  border: none;
  background: white;
  cursor: pointer;
  font-size: 0.85rem;
  border-right: 1px solid #e5e7eb;
}

.select-actions button:last-child {
  border-right: none;
}

.view-toggle button.active {
  background: #2563eb;
  color: white;
}

.empty {
  padding: 50px 20px;
  text-align: center;
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
}

.link {
  border: none;
  background: none;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  font: inherit;
  text-decoration: underline;
}

/* ---- Train ---- */
.train-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 0.85rem;
  color: #6b7280;
}

.auf-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.case-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  flex-wrap: wrap;
}

.scramble-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px 20px;
  text-align: center;
  flex: 1;
  min-width: 220px;
}

.scramble-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #9ca3af;
  margin-bottom: 8px;
}

.scramble {
  font-family: 'Courier New', monospace;
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  word-spacing: 0.2em;
}

.timer-area {
  text-align: center;
  padding: 28px 0 12px;
}

.timer {
  font-size: 4rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  line-height: 1;
  user-select: none;
}

.timer-area.early .timer {
  color: #dc2626;
}

.timer-area.ready .timer {
  color: #16a34a;
}

.hint {
  color: #9ca3af;
  font-size: 0.85rem;
  margin-top: 10px;
}

kbd {
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 4px;
  padding: 1px 6px;
  font-family: inherit;
  font-size: 0.8rem;
}

.reveal {
  text-align: center;
  min-height: 44px;
  margin-bottom: 8px;
}

.ghost {
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
}

.reveal-content {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
}

.reveal-name {
  font-weight: 700;
}

.reveal-alg {
  font-family: 'Courier New', monospace;
  color: #2563eb;
}

.history {
  margin-top: 20px;
  border-top: 1px solid #e5e7eb;
  padding-top: 14px;
}

.history h2 {
  font-size: 1rem;
  margin: 0 0 8px;
}

.session-summary {
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 10px;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-list li {
  display: flex;
  justify-content: space-between;
  padding: 5px 8px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.9rem;
}

.h-time {
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

/* ---- Browse ---- */
.browse-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.danger {
  border: 1px solid #fca5a5;
  color: #dc2626;
  background: white;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.85rem;
}

.group-title {
  font-size: 0.9rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 18px 0 10px;
}

.case-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.case-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  background: white;
  transition: opacity 0.15s;
}

.case-card.disabled {
  opacity: 0.5;
}

.case-head {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.case-name {
  font-weight: 700;
}

.badge {
  margin-left: auto;
  font-size: 0.65rem;
  background: #eef2ff;
  color: #4338ca;
  border-radius: 4px;
  padding: 1px 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.case-body {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 8px 0;
}

.case-body :deep(.pll-diagram) {
  flex-shrink: 0;
}

.case-alg {
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  color: #374151;
  word-spacing: 0.15em;
}

.case-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #9ca3af;
  font-family: 'Courier New', monospace;
}

/* ---- Speed ---- */
.focus {
  display: flex;
  align-items: center;
  gap: 8px;
}

.focus select {
  padding: 5px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.85rem;
}

.speed-session {
  justify-content: center;
  margin-top: 16px;
}

.ranking {
  margin-top: 20px;
  border-top: 1px solid #e5e7eb;
  padding-top: 14px;
}

.ranking-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.ranking-head h2 {
  font-size: 1rem;
  margin: 0;
}

.ranking-sub {
  font-size: 0.8rem;
  color: #9ca3af;
}

.rank-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rank-row {
  display: grid;
  grid-template-columns: 24px 90px 1fr 56px auto;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.rank-row:nth-child(even) {
  background: #f9fafb;
}

.rank-row.current {
  background: #eff6ff;
  box-shadow: 0 0 0 1px #bfdbfe inset;
}

.rank-pos {
  color: #9ca3af;
  font-family: 'Courier New', monospace;
  text-align: right;
}

.rank-name {
  font-weight: 600;
}

.rank-bar {
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
}

.rank-bar-fill {
  display: block;
  height: 100%;
  background: #94a3b8;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.rank-bar-fill.good { background: #4ade80; }
.rank-bar-fill.warn { background: #fbbf24; }
.rank-bar-fill.bad { background: #f87171; }
.rank-bar-fill.na { background: #e5e7eb; }

.rank-ratio {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  text-align: right;
}

.rank-ratio.good { color: #16a34a; }
.rank-ratio.warn { color: #d97706; }
.rank-ratio.bad { color: #dc2626; }
.rank-ratio.na { color: #9ca3af; font-weight: 500; }

.rank-times {
  font-family: 'Courier New', monospace;
  font-size: 0.78rem;
  color: #9ca3af;
  display: flex;
  gap: 6px;
  align-items: baseline;
}

.rank-ao {
  color: #374151;
  font-weight: 600;
}

.rank-ao.prov {
  color: #9ca3af;
  font-weight: 500;
  font-style: italic;
}

.rank-par {
  color: #cbd5e1;
}

.rank-samples {
  color: #9ca3af;
}
</style>
