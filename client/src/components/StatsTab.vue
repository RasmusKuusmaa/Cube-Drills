<template>
  <div class="stats-tab">
    <header class="stats-header">
      <div>
        <h1>Statistics</h1>
        <p class="subtitle">{{ scopeLabel }}</p>
      </div>
      <div class="scope-toggle">
        <button :class="{ active: scope === 'current' }" @click="scope = 'current'">
          Current session
        </button>
        <button :class="{ active: scope === 'all' }" @click="scope = 'all'">
          All sessions
        </button>
      </div>
    </header>

    <div v-if="!hasData" class="empty">
      No solves yet. Complete some solves to see your statistics.
    </div>

    <template v-else>
      <!-- Today -->
      <section class="today-section">
        <div class="section-head">
          <h2>Today</h2>
          <span class="section-sub">{{ todayDateLabel }}</span>
        </div>
        <div v-if="todayCounts.total === 0" class="empty subtle">
          No solves yet today.
        </div>
        <div v-else class="cards">
          <div class="metric metric-accent">
            <span class="metric-label">Solves today</span>
            <span class="metric-value">{{ todayCounts.total }}</span>
            <span class="metric-sub">{{ todayCounts.completed }} completed</span>
          </div>
          <div class="metric">
            <span class="metric-label">Best single</span>
            <span class="metric-value">{{ fmt(todayBest) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Average</span>
            <span class="metric-value">{{ fmt(todayMean) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Best ao5</span>
            <span class="metric-value">{{ fmt(todayAverageBest('ao5')) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Best ao12</span>
            <span class="metric-value">{{ fmt(todayAverageBest('ao12')) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Solve time</span>
            <span class="metric-value">{{ formatDuration(todayTime.cumulativeSolveMs) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Inspection time</span>
            <span class="metric-value">{{ formatDuration(todayTime.inspectionMs) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Solve + inspection</span>
            <span class="metric-value">{{ formatDuration(todayTime.solvePlusInspectionMs) }}</span>
          </div>
          <div class="metric metric-accent">
            <span class="metric-label">Time on site</span>
            <span class="metric-value">{{ formatDuration(todayFocusMs) }}</span>
            <span class="metric-sub">focused today</span>
          </div>
          <div class="metric" v-if="todayInspection.used > 0">
            <span class="metric-label">Avg inspection</span>
            <span class="metric-value">{{ fmt(todayInspection.avgMs) }}</span>
            <span class="metric-sub">{{ todayInspection.used }} solves</span>
          </div>
        </div>
      </section>

      <!-- Headline numbers -->
      <div class="section-head">
        <h2>Overall</h2>
        <span class="section-sub">{{ scopeLabel }}</span>
      </div>
      <section class="cards">
        <div class="metric metric-accent">
          <span class="metric-label">Best single</span>
          <span class="metric-value">{{ fmt(best) }}</span>
          <span class="metric-sub" v-if="bestSolve">{{ formatDate(bestSolve.date) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Best ao5</span>
          <span class="metric-value">{{ fmt(averageBest('ao5')) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Best ao12</span>
          <span class="metric-value">{{ fmt(averageBest('ao12')) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Session mean</span>
          <span class="metric-value">{{ fmt(meanAll) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Total solves</span>
          <span class="metric-value">{{ counts.total }}</span>
          <span class="metric-sub">{{ counts.completed }} completed</span>
        </div>
        <div class="metric">
          <span class="metric-label">Solve time (sum)</span>
          <span class="metric-value">{{ formatDuration(totalPracticeMs) }}</span>
          <span class="metric-sub">cumulative</span>
        </div>
      </section>

      <!-- Time accounting -->
      <div class="section-head">
        <h2>Time accounting</h2>
        <span class="section-sub">where the time goes</span>
      </div>
      <section class="cards">
        <div class="metric">
          <span class="metric-label">Cumulative solve time</span>
          <span class="metric-value">{{ formatDuration(timeAccounting.cumulativeSolveMs) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Inspection time</span>
          <span class="metric-value">{{ formatDuration(timeAccounting.inspectionMs) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Solve + inspection</span>
          <span class="metric-value">{{ formatDuration(timeAccounting.solvePlusInspectionMs) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg solve</span>
          <span class="metric-value">{{ fmt(timeAccounting.avgSolveMs) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg solve + insp.</span>
          <span class="metric-value">{{ fmt(timeAccounting.avgSolvePlusInspectionMs) }}</span>
        </div>
      </section>

      <!-- Inspection (mode-aware) -->
      <template v-if="inspection.used > 0">
        <div class="section-head">
          <h2>Inspection</h2>
          <span class="section-sub">{{ inspection.used }} of {{ counts.total }} solves · {{ percent(inspection.usedPct) }}</span>
        </div>
        <section class="cards">
          <div class="metric">
            <span class="metric-label">Avg inspection</span>
            <span class="metric-value">{{ fmt(inspection.avgMs) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Best</span>
            <span class="metric-value">{{ fmt(inspection.bestMs) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Worst</span>
            <span class="metric-value">{{ fmt(inspection.worstMs) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">+2 from inspection</span>
            <span class="metric-value">{{ inspection.over15 }}</span>
            <span class="metric-sub">over 15s</span>
          </div>
          <div class="metric">
            <span class="metric-label">DNF from inspection</span>
            <span class="metric-value">{{ inspection.over17 }}</span>
            <span class="metric-sub">over 17s</span>
          </div>
        </section>
      </template>

      <!-- Multi-phase (mode-aware) -->
      <template v-if="phaseStats">
        <div class="section-head">
          <h2>Multi-phase breakdown</h2>
          <span class="section-sub">
            {{ phaseStats.count }} solves · {{ phaseStats.phaseCount }} phases · avg {{ fmt(phaseStats.avgTotalMs) }}
          </span>
        </div>
        <div class="panel wide">
          <table class="data-table">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Avg</th>
                <th>Share</th>
                <th>Best</th>
                <th>Worst</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in phaseStats.rows" :key="row.label">
                <td class="label">{{ row.label }}</td>
                <td class="num">{{ fmt(row.avgMs) }}</td>
                <td class="phase-bar">
                  <div class="bar-track"><div class="bar-fill" :style="{ width: row.sharePct + '%' }"></div></div>
                  <span class="pct">{{ row.sharePct.toFixed(0) }}%</span>
                </td>
                <td class="num best">{{ fmt(row.bestMs) }}</td>
                <td class="num">{{ fmt(row.worstMs) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div class="grid">
        <!-- Averages table -->
        <div class="panel">
          <h2>Averages</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Current</th>
                <th>Best</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in averages" :key="row.label">
                <td class="label">{{ row.label }}</td>
                <td class="num">{{ fmt(row.current) }}</td>
                <td class="num best">{{ fmt(row.best) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Singles -->
        <div class="panel">
          <h2>Singles</h2>
          <div class="kv-list">
            <div class="kv"><span>Best</span><span class="num">{{ fmt(best) }}</span></div>
            <div class="kv"><span>Worst</span><span class="num">{{ fmt(worst) }}</span></div>
            <div class="kv"><span>Mean</span><span class="num">{{ fmt(meanAll) }}</span></div>
            <div class="kv"><span>Median</span><span class="num">{{ fmt(median) }}</span></div>
            <div class="kv"><span>Std. deviation</span><span class="num">{{ fmt(stdDev) }}</span></div>
            <div class="kv"><span>Spread</span><span class="num">{{ fmt(spread) }}</span></div>
          </div>
        </div>

        <!-- Consistency / reliability -->
        <div class="panel">
          <h2>Consistency</h2>
          <div class="kv-list">
            <div class="kv">
              <span>Variation (CV)</span>
              <span class="num">{{ consistency !== null ? (consistency * 100).toFixed(1) + '%' : '--' }}</span>
            </div>
            <div class="kv">
              <span>DNF rate</span>
              <span class="num">{{ percent(counts.dnfRate) }} <small>({{ counts.dnf }})</small></span>
            </div>
            <div class="kv">
              <span>+2 rate</span>
              <span class="num">{{ percent(counts.plusTwoRate) }} <small>({{ counts.plusTwo }})</small></span>
            </div>
            <div class="kv">
              <span>Current streak</span>
              <span class="num">{{ streaks.current }}</span>
            </div>
            <div class="kv">
              <span>Longest streak</span>
              <span class="num">{{ streaks.longest }}</span>
            </div>
            <div class="kv" v-if="improvement">
              <span>ao12 trend</span>
              <span class="num" :class="improvement.delta <= 0 ? 'good' : 'bad'">
                {{ improvement.delta <= 0 ? '▼' : '▲' }} {{ fmt(Math.abs(improvement.delta)) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Activity -->
        <div class="panel">
          <h2>Activity</h2>
          <div class="kv-list">
            <div class="kv">
              <span>Tracked since</span>
              <span class="num">{{ activity.first ? formatDate(activity.first.toISOString()) : '--' }}</span>
            </div>
            <div class="kv">
              <span>Last solve</span>
              <span class="num">{{ activity.last ? formatDate(activity.last.toISOString()) : '--' }}</span>
            </div>
            <div class="kv"><span>Active days</span><span class="num">{{ activity.activeDays }}</span></div>
            <div class="kv"><span>Solves / active day</span><span class="num">{{ activity.perDay.toFixed(1) }}</span></div>
          </div>
        </div>
      </div>

      <!-- Trend chart -->
      <div class="panel wide">
        <div class="panel-head">
          <h2>Progression over time</h2>
          <div class="legend">
            <span class="dot single"></span> single
            <span class="dot ao5"></span> ao5
            <span class="dot ao12"></span> ao12
          </div>
        </div>
        <svg
          v-if="trend.length > 1"
          class="chart"
          :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
          preserveAspectRatio="none"
        >
          <line
            v-for="g in trendGrid"
            :key="'g' + g.y"
            :x1="PAD_L" :x2="CHART_W - PAD_R" :y1="g.y" :y2="g.y"
            class="gridline"
          />
          <text
            v-for="g in trendGrid"
            :key="'t' + g.y"
            :x="PAD_L - 6" :y="g.y + 3"
            class="axis-label" text-anchor="end"
          >{{ g.label }}</text>
          <polyline :points="trendSinglePoints" class="line-single" />
          <polyline v-if="trendAo5Points" :points="trendAo5Points" class="line-ao5" />
          <polyline v-if="trendAo12Points" :points="trendAo12Points" class="line-ao12" />
        </svg>
        <p v-else class="hint">Not enough solves to chart yet.</p>
      </div>

      <div class="grid">
        <!-- Distribution -->
        <div class="panel">
          <h2>Time distribution</h2>
          <svg
            v-if="histogram.length"
            class="chart short"
            :viewBox="`0 0 ${CHART_W} ${HIST_H}`"
            preserveAspectRatio="none"
          >
            <g v-for="(b, i) in histogram" :key="i">
              <rect
                :x="histX(i)" :y="histY(b.count)"
                :width="histBarW" :height="HIST_H - PAD_B - histY(b.count)"
                class="hist-bar"
              />
            </g>
          </svg>
          <div class="hist-axis" v-if="histRange">
            <span>{{ fmt(histRange.from) }}</span>
            <span>{{ fmt(histRange.to) }}</span>
          </div>
        </div>

        <!-- Sub-X breakdown -->
        <div class="panel">
          <h2>Sub-X breakdown</h2>
          <table class="data-table" v-if="subX.length">
            <tbody>
              <tr v-for="row in subX" :key="row.threshold">
                <td class="label">Sub-{{ (row.threshold / 1000).toFixed(0) }}</td>
                <td class="num">{{ row.count }}</td>
                <td class="bar-cell">
                  <div class="bar-track"><div class="bar-fill" :style="{ width: (row.percent * 100) + '%' }"></div></div>
                </td>
                <td class="num pct">{{ percent(row.percent) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="hint">Not enough range to break down.</p>
        </div>

        <!-- Weekday activity -->
        <div class="panel">
          <h2>Solves by weekday</h2>
          <div class="weekday-chart">
            <div v-for="d in weekdays" :key="d.label" class="weekday-col">
              <div class="weekday-bar-track">
                <div
                  class="weekday-bar"
                  :style="{ height: (maxWeekday ? (d.count / maxWeekday) * 100 : 0) + '%' }"
                  :title="`${d.count} solves`"
                ></div>
              </div>
              <span class="weekday-label">{{ d.label }}</span>
            </div>
          </div>
        </div>

        <!-- PB progression -->
        <div class="panel">
          <h2>PB progression</h2>
          <svg
            v-if="pbProgression.length > 1"
            class="chart short"
            :viewBox="`0 0 ${CHART_W} ${HIST_H}`"
            preserveAspectRatio="none"
          >
            <polyline :points="pbPoints" class="line-pb" />
          </svg>
          <p v-else class="hint">Set more personal bests to see progression.</p>
          <div class="kv pb-current" v-if="best !== null">
            <span>Current PB</span><span class="num best">{{ fmt(best) }}</span>
          </div>
        </div>
      </div>

      <!-- App-wide time spent (every tab / activity, all sessions) -->
      <div class="section-head">
        <h2>Time spent in app</h2>
        <span class="section-sub">focused wall-clock · all activity</span>
      </div>
      <section class="cards">
        <div class="metric metric-accent">
          <span class="metric-label">Total focused</span>
          <span class="metric-value">{{ formatDuration(focusTotalMs) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Focused today</span>
          <span class="metric-value">{{ formatDuration(todayFocusMs) }}</span>
        </div>
      </section>

      <div class="grid">
        <div class="panel">
          <h2>Time by tab</h2>
          <div v-if="focusByTab.length" class="kv-list">
            <div v-for="t in focusByTab" :key="t.tab" class="time-row">
              <span class="time-label">{{ t.label }}</span>
              <div class="bar-track"><div class="bar-fill" :style="{ width: (t.ms / maxTabMs) * 100 + '%' }"></div></div>
              <span class="num time-val">{{ formatDuration(t.ms) }}</span>
            </div>
          </div>
          <p v-else class="hint">No focused time recorded yet.</p>
        </div>

        <div class="panel">
          <h2>Time by activity</h2>
          <div class="kv-list">
            <div v-for="c in timeByCategoryTotal" :key="c.id" class="time-row">
              <span class="time-label">{{ c.icon }} {{ c.label }}</span>
              <div class="bar-track"><div class="bar-fill" :style="{ width: (c.ms / maxCatMs) * 100 + '%' }"></div></div>
              <span class="num time-val">{{ formatDuration(c.ms) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSessions } from '@/composables/useSessions'
import { useStats } from '@/composables/useStats'
import { useGamification } from '@/composables/useGamification'
import { formatMs, formatDuration, type Penalty } from '@/utils/solves'

type Solve = {
  id: string
  time: number
  scramble: string
  date: string
  penalty?: Penalty
  comment?: string | null
  phases?: number[] | null
  inspectionMs?: number | null
}

const { sessions, currentSession } = useSessions()

const scope = ref<'current' | 'all'>('current')

const scopedSolves = computed<Solve[]>(() => {
  if (scope.value === 'all') {
    return sessions.value
      .flatMap((s) => s.solves)
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
  return currentSession.value?.solves ?? []
})

const scopeLabel = computed(() =>
  scope.value === 'all'
    ? `All sessions · ${sessions.value.length} session${sessions.value.length === 1 ? '' : 's'}`
    : currentSession.value?.name ?? 'No session',
)

const {
  hasData,
  counts,
  best,
  worst,
  meanAll,
  median,
  stdDev,
  spread,
  consistency,
  bestSolve,
  totalPracticeMs,
  averages,
  activity,
  streaks,
  subX,
  histogram,
  trend,
  pbProgression,
  weekdays,
  improvement,
  inspection,
  timeAccounting,
  phaseStats,
} = useStats(scopedSolves)

// --- Today (within the current scope) -------------------------------------
const isToday = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

const todaySolves = computed<Solve[]>(() => scopedSolves.value.filter((s) => isToday(s.date)))

const {
  counts: todayCounts,
  best: todayBest,
  meanAll: todayMean,
  averages: todayAverages,
  timeAccounting: todayTime,
  inspection: todayInspection,
} = useStats(todaySolves)

const todayAverageBest = (label: string) =>
  todayAverages.value.find((a) => a.label === label)?.best ?? null

const todayDateLabel = computed(() =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
)

const fmt = (ms: number | null) => formatMs(ms)
const percent = (ratio: number) => (ratio * 100).toFixed(1) + '%'
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

const averageBest = (label: string) => averages.value.find((a) => a.label === label)?.best ?? null

// App-wide time accounting (not scoped to a session — spans every activity).
const { focusByTab, timeByCategoryTotal, focusTotalMs, todayFocusMs } = useGamification()
const maxTabMs = computed(() => Math.max(1, ...focusByTab.value.map((t) => t.ms)))
const maxCatMs = computed(() => Math.max(1, ...timeByCategoryTotal.value.map((t) => t.ms)))

const maxWeekday = computed(() => Math.max(0, ...weekdays.value.map((d) => d.count)))

// --- Chart geometry -------------------------------------------------------
const CHART_W = 600
const CHART_H = 240
const HIST_H = 160
const PAD_L = 44
const PAD_R = 12
const PAD_T = 12
const PAD_B = 22

const trendDomain = computed(() => {
  const values: number[] = []
  for (const p of trend.value) {
    values.push(p.single)
    if (p.ao5 !== null) values.push(p.ao5)
    if (p.ao12 !== null) values.push(p.ao12)
  }
  if (values.length === 0) return { min: 0, max: 1 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.05 || 1
  return { min: min - padding, max: max + padding }
})

const xFor = (index: number, count: number) => {
  if (count <= 1) return PAD_L
  return PAD_L + (index / (count - 1)) * (CHART_W - PAD_L - PAD_R)
}

const yFor = (value: number, h: number, min: number, max: number) => {
  if (max === min) return h - PAD_B
  const ratio = (value - min) / (max - min)
  return PAD_T + (1 - ratio) * (h - PAD_T - PAD_B)
}

const buildPolyline = (
  pairs: { index: number; value: number | null }[],
  count: number,
  h: number,
  min: number,
  max: number,
) =>
  pairs
    .filter((p) => p.value !== null)
    .map((p) => `${xFor(p.index, count).toFixed(1)},${yFor(p.value as number, h, min, max).toFixed(1)}`)
    .join(' ')

const trendSinglePoints = computed(() => {
  const { min, max } = trendDomain.value
  const count = trend.value.length
  return buildPolyline(
    trend.value.map((p, i) => ({ index: i, value: p.single })),
    count, CHART_H, min, max,
  )
})

const trendAo5Points = computed(() => {
  const { min, max } = trendDomain.value
  const count = trend.value.length
  const pts = buildPolyline(
    trend.value.map((p, i) => ({ index: i, value: p.ao5 })),
    count, CHART_H, min, max,
  )
  return pts || null
})

const trendAo12Points = computed(() => {
  const { min, max } = trendDomain.value
  const count = trend.value.length
  const pts = buildPolyline(
    trend.value.map((p, i) => ({ index: i, value: p.ao12 })),
    count, CHART_H, min, max,
  )
  return pts || null
})

const trendGrid = computed(() => {
  const { min, max } = trendDomain.value
  const lines = 4
  return Array.from({ length: lines + 1 }, (_, i) => {
    const value = min + ((max - min) * i) / lines
    return { y: yFor(value, CHART_H, min, max), label: formatMs(value) }
  })
})

// Histogram bars
const histBarW = computed(() => {
  const usable = CHART_W - PAD_L - PAD_R
  return histogram.value.length ? (usable / histogram.value.length) * 0.8 : 0
})
const histMax = computed(() => Math.max(1, ...histogram.value.map((b) => b.count)))
const histRange = computed(() => {
  const buckets = histogram.value
  if (buckets.length === 0) return null
  return { from: buckets[0]!.from, to: buckets[buckets.length - 1]!.to }
})
const histX = (i: number) => {
  const usable = CHART_W - PAD_L - PAD_R
  const slot = histogram.value.length ? usable / histogram.value.length : 0
  return PAD_L + i * slot + slot * 0.1
}
const histY = (count: number) =>
  PAD_T + (1 - count / histMax.value) * (HIST_H - PAD_T - PAD_B)

// PB progression line (step-style by index of completed solve)
const pbPoints = computed(() => {
  const pts = pbProgression.value
  if (pts.length < 2) return ''
  const maxIndex = pts[pts.length - 1]!.index || 1
  const values = pts.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  return pts
    .map((p) => {
      const x = PAD_L + (p.index / maxIndex) * (CHART_W - PAD_L - PAD_R)
      const y = yFor(p.value, HIST_H, min, max)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})
</script>

<style scoped>
.stats-tab {
  padding: 4px 4px 40px;
  max-width: 1100px;
  margin: 0 auto;
  color: #1f2937;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.stats-header h1 {
  margin: 0;
  font-size: 1.6rem;
}

.subtitle {
  margin: 2px 0 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.scope-toggle {
  display: flex;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
}

.scope-toggle button {
  padding: 8px 14px;
  border: none;
  background: white;
  cursor: pointer;
  font-size: 0.85rem;
}

.scope-toggle button.active {
  background: #2563eb;
  color: white;
}

.empty {
  padding: 60px 20px;
  text-align: center;
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
}

.empty.subtle {
  padding: 20px;
  text-align: left;
  font-size: 0.9rem;
}

.today-section {
  margin-bottom: 20px;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 4px 0 10px;
}

.section-head h2 {
  margin: 0;
  font-size: 1.05rem;
}

.section-sub {
  color: #6b7280;
  font-size: 0.85rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.metric {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-accent {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.metric-label {
  font-size: 0.78rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.metric-sub {
  font-size: 0.78rem;
  color: #9ca3af;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
}

.panel.wide {
  margin-bottom: 12px;
}

.panel h2 {
  margin: 0 0 12px;
  font-size: 1rem;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.panel-head h2 {
  margin: 0;
}

.legend {
  font-size: 0.78rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-left: 6px;
}

.dot.single { background: #cbd5e1; }
.dot.ao5 { background: #2563eb; }
.dot.ao12 { background: #f59e0b; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table th {
  text-align: left;
  color: #6b7280;
  font-weight: 600;
  font-size: 0.78rem;
  padding: 4px 6px;
  border-bottom: 1px solid #e5e7eb;
}

.data-table td {
  padding: 6px;
  border-bottom: 1px solid #f3f4f6;
}

.data-table .label {
  font-weight: 600;
}

.num {
  font-family: 'Courier New', monospace;
  text-align: right;
}

.data-table .num {
  text-align: right;
}

.best {
  color: #16a34a;
}

.kv-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 2px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.9rem;
}

.kv small {
  color: #9ca3af;
}

.good { color: #16a34a; }
.bad { color: #dc2626; }

.chart {
  width: 100%;
  height: 240px;
  display: block;
}

.chart.short {
  height: 160px;
}

.gridline {
  stroke: #f1f5f9;
  stroke-width: 1;
}

.axis-label {
  fill: #9ca3af;
  font-size: 9px;
  font-family: 'Courier New', monospace;
}

.line-single {
  fill: none;
  stroke: #cbd5e1;
  stroke-width: 1;
}

.line-ao5 {
  fill: none;
  stroke: #2563eb;
  stroke-width: 1.6;
}

.line-ao12 {
  fill: none;
  stroke: #f59e0b;
  stroke-width: 1.6;
}

.line-pb {
  fill: none;
  stroke: #16a34a;
  stroke-width: 1.8;
}

.hist-bar {
  fill: #2563eb;
  opacity: 0.85;
}

.hist-axis {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #9ca3af;
  font-family: 'Courier New', monospace;
  margin-top: 4px;
}

.bar-cell {
  width: 40%;
}

.bar-track {
  background: #f1f5f9;
  border-radius: 4px;
  height: 8px;
  overflow: hidden;
}

.bar-fill {
  background: #2563eb;
  height: 100%;
}

.pct {
  color: #6b7280;
  font-size: 0.82rem;
}

/* Bar cell used in the multi-phase table (bar + inline percent). */
.phase-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 7rem;
}

.phase-bar .bar-track {
  flex: 1;
}

/* Time-by-tab / time-by-activity rows. */
.time-row {
  display: grid;
  grid-template-columns: 6.5rem 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 5px 2px;
}

.time-label {
  font-size: 0.85rem;
}

.time-val {
  font-size: 0.82rem;
  color: #4b5563;
  white-space: nowrap;
}

.weekday-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 140px;
}

.weekday-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.weekday-bar-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}

.weekday-bar {
  width: 100%;
  background: #2563eb;
  border-radius: 4px 4px 0 0;
  min-height: 2px;
  transition: height 0.2s;
}

.weekday-label {
  margin-top: 4px;
  font-size: 0.72rem;
  color: #6b7280;
}

.pb-current {
  margin-top: 8px;
  border-bottom: none;
}

.hint {
  color: #9ca3af;
  font-size: 0.85rem;
  font-style: italic;
}
</style>
