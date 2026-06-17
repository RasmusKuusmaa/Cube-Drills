import { computed, reactive, ref, watch } from 'vue'
import api from '@/api/api'
import { useSessions } from '@/composables/useSessions'
import { metricTodayValue } from '@/composables/useGamification'

// ---- types ---------------------------------------------------------------
export type TaskKind = 'time' | 'count' | 'check'
export type TaskSource = 'manual' | 'focus' | 'solve' | 'alg' | 'cross' | 'inspection' | 'memo'

export type RoutineTask = {
    id: string
    label: string
    icon?: string | null
    kind: TaskKind
    source: TaskSource
    cube?: string | null
    target: number // minutes for 'time', reps for 'count'; ignored for 'check'
}

type Entry = { label: string; kind: TaskKind; target: number; value: number; done: boolean }
type DailyLog = {
    id?: number
    date: string
    notes: string | null
    rating: number | null
    entries: Record<string, Entry>
}

// A task's resolved state for "today".
export type TaskProgress = {
    task: RoutineTask
    value: number // ms for 'time', count for 'count'
    target: number // ms for 'time', count for 'count' (0 for 'check')
    done: boolean
    pct: number // 0..100
    auto: boolean // auto-tracked vs manual
    running: boolean // manual stopwatch currently running
}

// ---- local day key (matches useGamification's local-day bookkeeping) -----
const dayKey = (d = new Date()): string => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}
const prevDayKey = (key: string): string => {
    const [y, m, d] = key.split('-').map(Number)
    const dt = new Date(y!, m! - 1, d!)
    dt.setDate(dt.getDate() - 1)
    return dayKey(dt)
}
const isLocalToday = (iso: string): boolean => {
    const d = new Date(iso)
    return !Number.isNaN(d.getTime()) && dayKey(d) === dayKey()
}

// ---- module singletons ---------------------------------------------------
const tasks = ref<RoutineTask[]>([])
const dailyLogs = ref<DailyLog[]>([])

// Manual progress for today, keyed by task id ({ value: ms|count, done }).
// Seeded from today's saved log; the source of truth for manual tasks.
const manual = reactive<Record<string, { value: number; done: boolean }>>({})
const today = reactive<{ notes: string; rating: number | null }>({ notes: '', rating: null })

// Running manual stopwatches: task id -> start timestamp (ms).
const running = reactive<Record<string, number>>({})
// Ticks every second so running stopwatches re-render live.
const nowTick = ref(Date.now())
setInterval(() => (nowTick.value = Date.now()), 1000)

let initialized = false

const load = async () => {
    try {
        const [routineRes, logsRes] = await Promise.all([
            api.get('/routine'),
            api.get('/daily-logs'),
        ])
        tasks.value = (routineRes.data?.tasks ?? []) as RoutineTask[]
        dailyLogs.value = (logsRes.data ?? []) as DailyLog[]
    } catch {
        tasks.value = []
        dailyLogs.value = []
    }
    seedTodayFromLog()
}

// Pull today's saved manual values / notes / rating into local state.
const seedTodayFromLog = () => {
    const log = dailyLogs.value.find((l) => l.date === dayKey())
    today.notes = log?.notes ?? ''
    today.rating = log?.rating ?? null
    for (const key of Object.keys(manual)) delete manual[key]
    if (log) {
        for (const t of tasks.value) {
            if (t.source !== 'manual') continue
            const e = log.entries[t.id]
            if (e) manual[t.id] = { value: e.value ?? 0, done: !!e.done }
        }
    }
}

// ---- live progress -------------------------------------------------------
const { sessions } = useSessions()

const solveCountToday = (cube?: string | null): number => {
    let n = 0
    for (const s of sessions.value) {
        if (cube && s.cube !== cube) continue
        for (const solve of s.solves) {
            if (solve.penalty !== 'DNF' && isLocalToday(solve.date)) n++
        }
    }
    return n
}

const ensureManual = (id: string) => (manual[id] ??= { value: 0, done: false })

const liveValue = (task: RoutineTask): number => {
    if (task.source === 'manual') return ensureManual(task.id).value
    if (task.kind === 'count') return solveCountToday(task.cube)
    return metricTodayValue(task.source, task.cube) // ms for time-based sources
}

const targetInBase = (task: RoutineTask): number =>
    task.kind === 'time' ? task.target * 60000 : task.target // ms vs count

const isDone = (task: RoutineTask, value: number): boolean => {
    if (task.source === 'manual' && manual[task.id]?.done) return true
    if (task.kind === 'check') return !!manual[task.id]?.done
    return value >= targetInBase(task)
}

const todayProgress = computed<TaskProgress[]>(() => {
    nowTick.value // re-evaluate while a stopwatch runs
    return tasks.value.map((task) => {
        let value = liveValue(task)
        if (running[task.id]) value += Date.now() - running[task.id]!
        const target = targetInBase(task)
        const done = isDone(task, value)
        const pct = task.kind === 'check'
            ? (done ? 100 : 0)
            : target > 0
                ? Math.min(100, (value / target) * 100)
                : (done ? 100 : 0)
        return {
            task,
            value,
            target,
            done,
            pct,
            auto: task.source !== 'manual',
            running: !!running[task.id],
        }
    })
})

const completionToday = computed(() => {
    const list = todayProgress.value
    if (!list.length) return 0
    return list.filter((p) => p.done).length / list.length
})
const perfectToday = computed(
    () => todayProgress.value.length > 0 && todayProgress.value.every((p) => p.done),
)

// ---- persistence ---------------------------------------------------------
let routineTimer: ReturnType<typeof setTimeout> | null = null
const saveRoutine = (immediate = false) => {
    if (routineTimer) clearTimeout(routineTimer)
    const run = async () => {
        try {
            await api.put('/routine', { tasks: tasks.value })
        } catch {
            /* keep local state; will retry on next edit */
        }
    }
    if (immediate) run()
    else routineTimer = setTimeout(run, 500)
}

const buildTodayEntries = (): Record<string, Entry> => {
    const entries: Record<string, Entry> = {}
    for (const p of todayProgress.value) {
        // Persist the accrued (not the live-running) value.
        const stored = p.task.source === 'manual' ? ensureManual(p.task.id).value : p.value
        entries[p.task.id] = {
            label: p.task.label,
            kind: p.task.kind,
            target: p.task.target,
            value: Math.round(stored),
            done: isDone(p.task, stored),
        }
    }
    return entries
}

let logTimer: ReturnType<typeof setTimeout> | null = null
const saveToday = (immediate = false) => {
    if (logTimer) clearTimeout(logTimer)
    const run = async () => {
        const key = dayKey()
        const body = {
            notes: today.notes || null,
            rating: today.rating,
            entries: buildTodayEntries(),
        }
        try {
            const res = await api.put(`/daily-logs/${key}`, body)
            const saved = res.data as DailyLog
            const idx = dailyLogs.value.findIndex((l) => l.date === key)
            if (idx === -1) dailyLogs.value.unshift(saved)
            else dailyLogs.value[idx] = saved
        } catch {
            /* keep local state */
        }
    }
    if (immediate) run()
    else logTimer = setTimeout(run, 600)
}

// ---- task CRUD -----------------------------------------------------------
const addTask = (partial: Partial<RoutineTask> = {}) => {
    tasks.value.push({
        id: crypto.randomUUID(),
        label: partial.label ?? 'New task',
        icon: partial.icon ?? '🎯',
        kind: partial.kind ?? 'check',
        source: partial.source ?? 'manual',
        cube: partial.cube ?? null,
        target: partial.target ?? 0,
    })
    saveRoutine(true)
}
const updateTask = (id: string, patch: Partial<RoutineTask>) => {
    const t = tasks.value.find((x) => x.id === id)
    if (!t) return
    Object.assign(t, patch)
    saveRoutine()
}
const removeTask = (id: string) => {
    tasks.value = tasks.value.filter((x) => x.id !== id)
    delete manual[id]
    saveRoutine(true)
}
const moveTask = (id: string, dir: -1 | 1) => {
    const i = tasks.value.findIndex((x) => x.id === id)
    const j = i + dir
    if (i === -1 || j < 0 || j >= tasks.value.length) return
    const arr = tasks.value
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
    saveRoutine(true)
}

// ---- manual task interactions -------------------------------------------
const toggleStopwatch = (id: string) => {
    if (running[id]) {
        const elapsed = Date.now() - running[id]!
        ensureManual(id).value += elapsed
        delete running[id]
        saveToday(true)
    } else {
        running[id] = Date.now()
    }
}
const toggleDone = (id: string) => {
    const m = ensureManual(id)
    m.done = !m.done
    saveToday(true)
}
const setManualCount = (id: string, n: number) => {
    ensureManual(id).value = Math.max(0, Math.round(n))
    saveToday()
}
const addManualMinutes = (id: string, minutes: number) => {
    ensureManual(id).value += Math.max(0, minutes) * 60000
    saveToday(true)
}

// Persist notes/rating edits (debounced via saveToday's timer).
watch(() => [today.notes, today.rating], () => saveToday())

// ---- history / summary ---------------------------------------------------
const logStats = (log: DailyLog) => {
    const entries = Object.values(log.entries ?? {})
    const total = entries.length
    const done = entries.filter((e) => e.done).length
    const timeMs = entries
        .filter((e) => e.kind === 'time')
        .reduce((a, e) => a + (e.value ?? 0), 0)
    return {
        total,
        done,
        completion: total ? done / total : 0,
        timeMs,
        perfect: total > 0 && done === total,
    }
}

const history = computed(() =>
    [...dailyLogs.value]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((log) => ({ log, ...logStats(log) })),
)

const completionRate = computed(() => {
    const rated = history.value.filter((h) => h.total > 0)
    if (!rated.length) return 0
    return rated.reduce((a, h) => a + h.completion, 0) / rated.length
})

const perfectStreak = computed(() => {
    const perfect = new Set(
        history.value.filter((h) => h.perfect).map((h) => h.log.date),
    )
    // Current streak: count back from today (or yesterday if today not perfect yet).
    let cursor = perfect.has(dayKey())
        ? dayKey()
        : perfect.has(prevDayKey(dayKey()))
            ? prevDayKey(dayKey())
            : null
    let current = 0
    while (cursor && perfect.has(cursor)) {
        current++
        cursor = prevDayKey(cursor)
    }
    // Best streak across all perfect days.
    const days = [...perfect].sort()
    let best = 0
    let run = 0
    let prev: string | null = null
    for (const d of days) {
        run = prev && prevDayKey(d) === prev ? run + 1 : 1
        best = Math.max(best, run)
        prev = d
    }
    return { current, best }
})

export function useRoutine() {
    if (!initialized) {
        initialized = true
        load()
    }

    return {
        tasks,
        todayProgress,
        completionToday,
        perfectToday,
        today,
        // task editing
        addTask,
        updateTask,
        removeTask,
        moveTask,
        // manual interactions
        running,
        toggleStopwatch,
        toggleDone,
        setManualCount,
        addManualMinutes,
        // persistence hooks
        saveToday,
        // history
        dailyLogs,
        history,
        completionRate,
        perfectStreak,
        dayKey,
    }
}
