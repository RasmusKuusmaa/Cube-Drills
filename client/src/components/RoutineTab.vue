<template>
  <div class="routine-tab">
    <header class="routine-header">
      <div>
        <h1>Daily Routine</h1>
        <p class="lead">Build a daily practice plan, track it live, and log how it went.</p>
      </div>
      <button class="edit-toggle" :class="{ on: editing }" @click="editing = !editing">
        {{ editing ? 'Done editing' : 'Edit routine' }}
      </button>
    </header>

    <!-- Summary strip -->
    <section class="summary">
      <div class="sum-card accent">
        <div class="ring" :style="ringStyle">
          <span class="ring-num">{{ Math.round(completionToday * 100) }}%</span>
        </div>
        <div class="sum-meta">
          <span class="sum-title">Today</span>
          <span class="sum-sub">{{ doneCount }} / {{ todayProgress.length }} done</span>
          <span v-if="perfectToday" class="perfect-badge">✓ Perfect day</span>
        </div>
      </div>
      <div class="sum-card">
        <span class="sum-big">🔥 {{ perfectStreak.current }}</span>
        <span class="sum-lbl">perfect-day streak</span>
        <span class="sum-foot">best {{ perfectStreak.best }}</span>
      </div>
      <div class="sum-card">
        <span class="sum-big">{{ Math.round(completionRate * 100) }}%</span>
        <span class="sum-lbl">completion rate</span>
        <span class="sum-foot">across {{ history.length }} day{{ history.length === 1 ? '' : 's' }}</span>
      </div>
    </section>

    <!-- Editor -->
    <section v-if="editing" class="block">
      <div class="block-head">
        <h2>Edit routine</h2>
        <span class="hint-text">Auto-tracked tasks fill in from your activity; manual tasks use a stopwatch or checkbox.</span>
      </div>

      <div v-if="!tasks.length" class="empty subtle">No tasks yet. Add your first one below.</div>

      <div class="edit-list">
        <div v-for="(t, i) in tasks" :key="t.id" class="edit-row">
          <div class="edit-order">
            <button :disabled="i === 0" @click="moveTask(t.id, -1)" title="Move up">▲</button>
            <button :disabled="i === tasks.length - 1" @click="moveTask(t.id, 1)" title="Move down">▼</button>
          </div>
          <input class="f-icon" maxlength="2" v-model="t.icon" @input="updateTask(t.id, { icon: t.icon })" />
          <input class="f-label" v-model="t.label" placeholder="Task name" @input="updateTask(t.id, { label: t.label })" />
          <select class="f-source" :value="t.source" @change="onSourceChange(t, $event)">
            <option v-for="s in SOURCES" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
          <select class="f-kind" :value="t.kind" @change="updateTask(t.id, { kind: ($event.target as HTMLSelectElement).value as TaskKind })">
            <option v-for="k in kindsFor(t.source)" :key="k" :value="k">{{ KIND_LABELS[k] }}</option>
          </select>
          <select v-if="t.source === 'solve'" class="f-cube" :value="t.cube ?? ''" @change="updateTask(t.id, { cube: ($event.target as HTMLSelectElement).value || null })">
            <option value="">Any cube</option>
            <option v-for="c in CUBES" :key="c" :value="c">{{ c }}</option>
          </select>
          <span v-else class="f-cube-spacer"></span>
          <span class="f-target" v-if="t.kind !== 'check'">
            <input type="number" min="0" max="600" v-model.number="t.target" @input="updateTask(t.id, { target: t.target })" />
            <span class="unit">{{ t.kind === 'time' ? 'min' : 'reps' }}</span>
          </span>
          <span class="f-target dim" v-else>—</span>
          <button class="del" @click="removeTask(t.id)" title="Delete">✕</button>
        </div>
      </div>

      <div class="add-row">
        <button class="add-btn" @click="addTask()">+ Add task</button>
        <span class="preset-label">Quick add:</span>
        <button v-for="p in PRESETS" :key="p.label" class="preset-chip" @click="addTask(p.task)">
          {{ p.task.icon }} {{ p.label }}
        </button>
      </div>
    </section>

    <!-- Today's tasks -->
    <section class="block">
      <div class="block-head">
        <h2>Today</h2>
        <span class="hint-text">{{ todayLabel }}</span>
      </div>

      <div v-if="!todayProgress.length" class="empty">
        No routine yet. Click <strong>Edit routine</strong> to add tasks like “10m inspection” or “Solve 5x5 30m”.
      </div>

      <div v-else class="task-list">
        <div v-for="p in todayProgress" :key="p.task.id" class="task-row" :class="{ done: p.done }">
          <span class="t-icon">{{ p.done ? '✓' : (p.task.icon || '•') }}</span>
          <div class="t-main">
            <div class="t-top">
              <span class="t-label">{{ p.task.label }}</span>
              <span class="t-meta">{{ sourceLabel(p.task) }}</span>
            </div>
            <div class="t-bar"><span class="t-fill" :style="{ width: p.pct + '%' }"></span></div>
          </div>
          <span class="t-val">{{ valueLabel(p) }}</span>
          <div class="t-actions">
            <template v-if="p.task.source === 'manual' && p.task.kind === 'time'">
              <button class="sw" :class="{ on: p.running }" @click="toggleStopwatch(p.task.id)">
                {{ p.running ? '⏸ Stop' : '▶ Start' }}
              </button>
            </template>
            <template v-else-if="p.task.source === 'manual' && p.task.kind === 'count'">
              <button class="step" @click="setManualCount(p.task.id, p.value - 1)">−</button>
              <button class="step" @click="setManualCount(p.task.id, p.value + 1)">+</button>
            </template>
            <label v-if="p.task.source === 'manual'" class="check">
              <input type="checkbox" :checked="p.done" @change="toggleDone(p.task.id)" />
            </label>
            <span v-else class="auto-tag" :class="{ ok: p.done }">{{ p.done ? 'done' : 'auto' }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Daily log -->
    <section class="block">
      <div class="block-head">
        <h2>Daily log</h2>
        <span class="hint-text">How did today's practice feel?</span>
      </div>
      <div class="log-card">
        <div class="rating">
          <span class="rating-label">Rating</span>
          <button
            v-for="n in 5" :key="n"
            class="star" :class="{ on: (today.rating ?? 0) >= n }"
            @click="setRating(n)"
          >★</button>
          <button v-if="today.rating" class="clear-rating" @click="today.rating = null">clear</button>
        </div>
        <textarea
          v-model="today.notes"
          class="notes"
          rows="4"
          placeholder="What went well? What to focus on tomorrow? Any breakthroughs or frustrations…"
        ></textarea>
        <span class="saved-hint">Saved automatically</span>
      </div>
    </section>

    <!-- History -->
    <section class="block">
      <div class="block-head">
        <h2>History</h2>
        <span class="hint-text">{{ history.length }} day{{ history.length === 1 ? '' : 's' }} logged</span>
      </div>

      <div v-if="!history.length" class="empty subtle">No days logged yet — your routine days will show up here.</div>

      <div v-else class="hist-list">
        <div v-for="h in history" :key="h.log.date" class="hist-item" :class="{ perfect: h.perfect }">
          <button class="hist-summary" @click="toggle(h.log.date)">
            <span class="hist-date">{{ formatDay(h.log.date) }}</span>
            <span class="hist-bar"><span class="hist-fill" :style="{ width: h.completion * 100 + '%' }"></span></span>
            <span class="hist-pct">{{ Math.round(h.completion * 100) }}%</span>
            <span class="hist-tag">{{ h.done }}/{{ h.total }}</span>
            <span class="hist-time">{{ h.timeMs ? formatDuration(h.timeMs) : '' }}</span>
            <span v-if="h.log.rating" class="hist-rating">{{ '★'.repeat(h.log.rating) }}</span>
            <span v-if="h.perfect" class="hist-perfect">✓</span>
            <span class="hist-caret">{{ expanded.has(h.log.date) ? '▴' : '▾' }}</span>
          </button>
          <div v-if="expanded.has(h.log.date)" class="hist-detail">
            <div class="hist-tasks">
              <div v-for="(e, id) in h.log.entries" :key="id" class="hist-task" :class="{ done: e.done }">
                <span class="ht-icon">{{ e.done ? '✓' : '○' }}</span>
                <span class="ht-label">{{ e.label }}</span>
                <span class="ht-val">{{ entryValueLabel(e) }}</span>
              </div>
            </div>
            <p v-if="h.log.notes" class="hist-notes">{{ h.log.notes }}</p>
            <p v-else class="hist-notes dim">No notes for this day.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoutine, type RoutineTask, type TaskKind, type TaskProgress } from '@/composables/useRoutine'
import { formatDuration } from '@/utils/solves'

const {
  tasks,
  todayProgress,
  completionToday,
  perfectToday,
  today,
  addTask,
  updateTask,
  removeTask,
  moveTask,
  toggleStopwatch,
  toggleDone,
  setManualCount,
  saveToday,
  history,
  completionRate,
  perfectStreak,
} = useRoutine()

const editing = ref(false)
const expanded = ref<Set<string>>(new Set())
const toggle = (date: string) => {
  const next = new Set(expanded.value)
  next.has(date) ? next.delete(date) : next.add(date)
  expanded.value = next
}

const CUBES = ['2x2', '3x3', '4x4', '5x5', 'Megaminx', 'Pyraminx', 'Skewb', 'Square-1', 'Clock']

const SOURCES: { id: RoutineTask['source']; label: string }[] = [
  { id: 'manual', label: 'Manual' },
  { id: 'focus', label: 'Time on site' },
  { id: 'solve', label: 'Solving' },
  { id: 'alg', label: 'Algorithms' },
  { id: 'cross', label: 'Cross' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'memo', label: 'Memo' },
]

const KIND_LABELS: Record<TaskKind, string> = {
  time: 'Minutes',
  count: 'Count',
  check: 'Checkbox',
}

// Which kinds make sense per source.
const kindsFor = (source: RoutineTask['source']): TaskKind[] => {
  if (source === 'manual') return ['time', 'count', 'check']
  if (source === 'solve') return ['time', 'count']
  return ['time']
}

const onSourceChange = (t: RoutineTask, e: Event) => {
  const source = (e.target as HTMLSelectElement).value as RoutineTask['source']
  const allowed = kindsFor(source)
  const patch: Partial<RoutineTask> = { source }
  if (!allowed.includes(t.kind)) patch.kind = allowed[0]
  if (source !== 'solve') patch.cube = null
  updateTask(t.id, patch)
}

const PRESETS: { label: string; task: Partial<RoutineTask> }[] = [
  { label: 'Slow F2L 10m', task: { label: 'Slow-turning F2L', icon: '🐢', kind: 'time', source: 'manual', target: 10 } },
  { label: 'Inspection 10m', task: { label: 'Inspection drill', icon: '👀', kind: 'time', source: 'inspection', target: 10 } },
  { label: '50 solves', task: { label: '50 solves', icon: '🧩', kind: 'count', source: 'solve', target: 50 } },
  { label: '5x5 30m', task: { label: 'Solve 5x5', icon: '🟦', kind: 'time', source: 'solve', cube: '5x5', target: 30 } },
  { label: 'Time on site 30m', task: { label: 'Time on site', icon: '🧘', kind: 'time', source: 'focus', target: 30 } },
]

const doneCount = computed(() => todayProgress.value.filter((p) => p.done).length)

const ringStyle = computed(() => {
  const deg = Math.round(completionToday.value * 360)
  return { background: `conic-gradient(#2563eb ${deg}deg, #e5e7eb ${deg}deg)` }
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
)

const sourceLabel = (t: RoutineTask): string => {
  if (t.source === 'manual') return t.kind === 'check' ? 'manual · checkbox' : 'manual · stopwatch'
  const base = SOURCES.find((s) => s.id === t.source)?.label ?? t.source
  if (t.source === 'solve') {
    const what = t.cube ? `${t.cube} ` : ''
    return t.kind === 'count' ? `auto · ${what}solve count` : `auto · ${what}solving time`
  }
  return `auto · ${base.toLowerCase()} time`
}

const valueLabel = (p: TaskProgress): string => {
  if (p.task.kind === 'check') return p.done ? 'Done' : '—'
  if (p.task.kind === 'time') return `${formatDuration(p.value)} / ${p.task.target}m`
  return `${p.value} / ${p.task.target}`
}

const entryValueLabel = (e: { kind: TaskKind; target: number; value: number; done: boolean }): string => {
  if (e.kind === 'check') return e.done ? 'Done' : '—'
  if (e.kind === 'time') return `${formatDuration(e.value)} / ${e.target}m`
  return `${e.value} / ${e.target}`
}

const setRating = (n: number) => {
  today.rating = today.rating === n ? null : n
}

const formatDay = (key: string): string => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

// Persist today's auto progress as soon as the tab is opened.
onMounted(() => saveToday(true))
</script>

<style scoped>
.routine-tab {
  max-width: 900px;
  margin: 0 auto;
  color: #1f2937;
  padding-bottom: 48px;
}

.routine-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.routine-header h1 { margin: 0; font-size: 1.7rem; }
.lead { margin: 4px 0 0; color: #6b7280; font-size: 0.95rem; }

.edit-toggle {
  border: 1px solid #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  flex-shrink: 0;
}
.edit-toggle.on { background: #2563eb; color: white; }

/* Summary strip */
.summary {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 12px;
  margin: 20px 0 26px;
}
@media (max-width: 620px) { .summary { grid-template-columns: 1fr; } }

.sum-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sum-card.accent {
  flex-direction: row;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #eff6ff, #f5f3ff);
  border-color: #e0e7ff;
}
.ring {
  position: relative;
  width: 72px; height: 72px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ring::before {
  content: '';
  position: absolute;
  width: 54px; height: 54px;
  border-radius: 50%;
  background: #fff;
}
.ring-num { position: relative; font-weight: 800; font-size: 1rem; }
.sum-meta { display: flex; flex-direction: column; gap: 2px; }
.sum-title { font-weight: 700; }
.sum-sub { color: #6b7280; font-size: 0.85rem; }
.perfect-badge {
  margin-top: 4px;
  align-self: flex-start;
  background: #dcfce7; color: #16a34a;
  font-size: 0.75rem; font-weight: 700;
  padding: 2px 8px; border-radius: 999px;
}
.sum-big { font-size: 1.8rem; font-weight: 800; color: #ea580c; line-height: 1.1; }
.sum-card:nth-child(3) .sum-big { color: #2563eb; }
.sum-lbl { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; color: #9ca3af; }
.sum-foot { font-size: 0.78rem; color: #9ca3af; }

/* Blocks */
.block { margin-bottom: 28px; }
.block-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 12px; }
.block-head h2 { margin: 0; font-size: 1.15rem; }
.hint-text { font-size: 0.82rem; color: #9ca3af; }

.empty {
  padding: 28px 20px; text-align: center; color: #6b7280;
  background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 12px;
}
.empty.subtle { padding: 16px; text-align: left; font-size: 0.9rem; }

/* Today task rows */
.task-list { display: flex; flex-direction: column; gap: 8px; }
.task-row {
  display: grid;
  grid-template-columns: 36px 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: white;
}
.task-row.done { border-color: #bbf7d0; background: #f6fef9; }
.t-icon {
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  background: #eff6ff; border-radius: 9px; font-size: 1.1rem;
}
.task-row.done .t-icon { background: #dcfce7; color: #16a34a; font-weight: 800; }
.t-main { min-width: 0; }
.t-top { display: flex; align-items: baseline; gap: 8px; }
.t-label { font-weight: 700; font-size: 0.95rem; }
.t-meta { font-size: 0.72rem; color: #9ca3af; }
.t-bar { height: 7px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin-top: 6px; }
.t-fill { display: block; height: 100%; background: #2563eb; border-radius: 4px; transition: width 0.3s; }
.task-row.done .t-fill { background: #16a34a; }
.t-val { font-family: 'Courier New', monospace; font-size: 0.82rem; color: #4b5563; white-space: nowrap; }
.t-actions { display: flex; align-items: center; gap: 8px; }

.sw {
  border: 1px solid #2563eb; background: #eff6ff; color: #1d4ed8;
  border-radius: 8px; padding: 5px 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer;
}
.sw.on { background: #fee2e2; border-color: #ef4444; color: #b91c1c; }
.step {
  width: 28px; height: 28px; border: 1px solid #d1d5db; background: white;
  border-radius: 7px; cursor: pointer; font-size: 1rem; line-height: 1;
}
.check input { width: 18px; height: 18px; cursor: pointer; }
.auto-tag {
  font-size: 0.72rem; color: #9ca3af; background: #f3f4f6;
  padding: 3px 8px; border-radius: 999px;
}
.auto-tag.ok { color: #16a34a; background: #dcfce7; font-weight: 700; }

/* Editor */
.edit-list { display: flex; flex-direction: column; gap: 8px; }
.edit-row {
  display: grid;
  grid-template-columns: 28px 40px minmax(110px, 1.4fr) 120px 96px 96px 88px 28px;
  align-items: center; gap: 8px;
  padding: 6px; border: 1px solid #e5e7eb; border-radius: 10px; background: white;
}
.edit-order { display: flex; flex-direction: column; }
.edit-order button {
  border: none; background: none; cursor: pointer; color: #9ca3af; line-height: 1; font-size: 0.7rem; padding: 0;
}
.edit-order button:disabled { opacity: 0.3; cursor: default; }
.edit-row input, .edit-row select {
  border: 1px solid #d1d5db; border-radius: 6px; padding: 5px 6px; font-size: 0.82rem; width: 100%;
}
.f-icon { text-align: center; }
.f-target { display: flex; align-items: center; gap: 4px; }
.f-target input { width: 52px; text-align: right; }
.f-target.dim { color: #d1d5db; justify-content: center; }
.f-cube-spacer { display: block; }
.unit { font-size: 0.72rem; color: #9ca3af; }
.del { border: none; background: none; color: #d1d5db; cursor: pointer; font-size: 0.9rem; }
.del:hover { color: #dc2626; }

.add-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
.add-btn {
  border: 1px dashed #2563eb; background: #eff6ff; color: #1d4ed8;
  border-radius: 8px; padding: 7px 14px; cursor: pointer; font-weight: 600; font-size: 0.85rem;
}
.preset-label { font-size: 0.78rem; color: #9ca3af; margin-left: 6px; }
.preset-chip {
  border: 1px solid #e5e7eb; background: white; border-radius: 999px;
  padding: 5px 11px; cursor: pointer; font-size: 0.78rem;
}
.preset-chip:hover { border-color: #c7d2fe; background: #f5f8ff; }

@media (max-width: 760px) {
  .edit-row { grid-template-columns: 24px 36px 1fr 28px; grid-auto-flow: row; }
  .edit-row .f-source, .edit-row .f-kind, .edit-row .f-cube, .edit-row .f-cube-spacer, .edit-row .f-target {
    grid-column: 3 / 4;
  }
}

/* Daily log */
.log-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
.rating { display: flex; align-items: center; gap: 4px; margin-bottom: 10px; }
.rating-label { font-size: 0.82rem; color: #6b7280; margin-right: 6px; }
.star { border: none; background: none; cursor: pointer; font-size: 1.3rem; color: #d1d5db; line-height: 1; padding: 0 1px; }
.star.on { color: #f59e0b; }
.clear-rating { border: none; background: none; color: #9ca3af; font-size: 0.75rem; cursor: pointer; margin-left: 8px; text-decoration: underline; }
.notes {
  width: 100%; box-sizing: border-box; border: 1px solid #d1d5db; border-radius: 8px;
  padding: 10px; font-size: 0.9rem; font-family: inherit; resize: vertical;
}
.saved-hint { font-size: 0.72rem; color: #9ca3af; display: block; margin-top: 6px; }

/* History */
.hist-list { display: flex; flex-direction: column; gap: 6px; }
.hist-item { border: 1px solid #e5e7eb; border-radius: 10px; background: white; overflow: hidden; }
.hist-item.perfect { border-color: #bbf7d0; }
.hist-summary {
  display: grid;
  grid-template-columns: 7rem 1fr 3rem 3rem 5rem auto 1rem 1rem;
  align-items: center; gap: 10px;
  width: 100%; border: none; background: none; cursor: pointer;
  padding: 10px 12px; text-align: left; font-size: 0.85rem;
}
.hist-date { font-weight: 700; }
.hist-bar { height: 7px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
.hist-fill { display: block; height: 100%; background: #2563eb; }
.hist-item.perfect .hist-fill { background: #16a34a; }
.hist-pct { font-family: 'Courier New', monospace; color: #4b5563; text-align: right; }
.hist-tag { font-size: 0.76rem; color: #9ca3af; font-family: 'Courier New', monospace; text-align: right; }
.hist-time { font-size: 0.76rem; color: #6b7280; font-family: 'Courier New', monospace; white-space: nowrap; }
.hist-rating { color: #f59e0b; font-size: 0.78rem; }
.hist-perfect { color: #16a34a; font-weight: 800; }
.hist-caret { color: #9ca3af; }

.hist-detail { padding: 4px 12px 12px; border-top: 1px solid #f3f4f6; }
.hist-tasks { display: flex; flex-direction: column; gap: 3px; margin: 8px 0; }
.hist-task { display: grid; grid-template-columns: 20px 1fr auto; gap: 8px; align-items: center; font-size: 0.83rem; }
.hist-task.done .ht-label { color: #16a34a; }
.ht-icon { text-align: center; color: #9ca3af; }
.hist-task.done .ht-icon { color: #16a34a; }
.ht-val { font-family: 'Courier New', monospace; font-size: 0.78rem; color: #6b7280; }
.hist-notes { font-size: 0.85rem; color: #374151; white-space: pre-wrap; margin: 8px 0 0; }
.hist-notes.dim { color: #9ca3af; font-style: italic; }
</style>
