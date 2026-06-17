import { computed, ref } from 'vue'
import {
    ACHIEVEMENTS,
    DAILY_COUNT,
    DAILY_POOL,
    PB_XP,
    TIME_CATEGORIES,
    baseXp,
    levelInfo,
    type AchievementSnapshot,
    type ActivityType,
    type GameEvent,
} from '@/data/gamification'
import { formatMs } from '@/utils/solves'
import api from '@/api/api'

const STORE_KEY = 'gamification.v1'

// A goal can target an activity category or the special 'focus' (wall-clock) metric.
type GoalKey = ActivityType | 'focus'

type DailyItem = { id: string; progress: number; done: boolean }

type State = {
    xp: number
    totals: {
        solves: number
        cross: number
        inspection: number
        memo: number
        memoCorrect: number
        alg: number
        bestSingleMs: number | null
        bestAo12Ms: number | null
    }
    recent: number[] // recent effective single times (newest first, capped at 12)
    streak: { current: number; longest: number; lastActive: string }
    achievements: Record<string, string> // id -> ISO timestamp unlocked
    daily: { date: string; items: DailyItem[] }
    // Per-day practice time (ms) for the non-solve categories.
    timeByDay: Record<string, Partial<Record<ActivityType, number>>>
    // Per-day solving time (ms) broken down by puzzle, e.g. { '2026-06-10': { '3x3': 1234 } }.
    solveByDay: Record<string, Record<string, number>>
    // Per-day focused (wall-clock) time (ms) while actively practicing.
    focusByDay: Record<string, number>
    // Per-day focused time (ms) attributed to the active tab/view.
    focusByTabDay: Record<string, Record<string, number>>
    goals: Partial<Record<GoalKey, number>> // category/focus -> target minutes/day
    goalDays: Record<string, GoalKey[]> // dateKey -> goals already credited
}

export type Toast = {
    id: number
    kind: 'level' | 'pb' | 'daily' | 'achievement' | 'streak' | 'goal'
    icon: string
    title: string
    sub: string
}

export type SolveRecord = { time: number; penalty?: string | null; date?: string | null; cube?: string | null }

// ---- date helpers --------------------------------------------------------
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
const isYesterday = (key: string): boolean => prevDayKey(dayKey()) === key
const consecutiveDays = (a: string, b: string): boolean => prevDayKey(b) === a

// ---- seeded RNG (deterministic daily challenge pick) ---------------------
const hashStr = (s: string): number => {
    let h = 2166136261
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}
const mulberry32 = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pickDaily = (dateKey: string): DailyItem[] => {
    const rng = mulberry32(hashStr(dateKey))
    const idx = DAILY_POOL.map((_, i) => i)
    for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[idx[i], idx[j]] = [idx[j]!, idx[i]!]
    }
    return idx.slice(0, DAILY_COUNT).map((i) => ({ id: DAILY_POOL[i]!.id, progress: 0, done: false }))
}

// ---- ao12 over the recent buffer -----------------------------------------
const ao12Of = (times: number[]): number | null => {
    if (times.length < 12) return null
    const sorted = [...times.slice(0, 12)].sort((a, b) => a - b)
    const middle = sorted.slice(1, sorted.length - 1)
    return middle.reduce((a, t) => a + t, 0) / middle.length
}

// ---- persistence ---------------------------------------------------------
const freshState = (): State => ({
    xp: 0,
    totals: {
        solves: 0, cross: 0, inspection: 0, memo: 0, memoCorrect: 0, alg: 0,
        bestSingleMs: null, bestAo12Ms: null,
    },
    recent: [],
    streak: { current: 0, longest: 0, lastActive: '' },
    achievements: {},
    daily: { date: '', items: [] },
    timeByDay: {},
    solveByDay: {},
    focusByDay: {},
    focusByTabDay: {},
    goals: {},
    goalDays: {},
})

const load = (): State => {
    try {
        const raw = localStorage.getItem(STORE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw)
            const base = freshState()
            const timeByDay = parsed.timeByDay ?? {}
            // Migration: solving time moved to `solveByDay`; drop any legacy
            // `solve` key so it isn't double-counted in daily totals.
            for (const day of Object.keys(timeByDay)) delete timeByDay[day].solve
            return {
                ...base,
                ...parsed,
                totals: { ...base.totals, ...parsed.totals },
                streak: { ...base.streak, ...parsed.streak },
                daily: { ...base.daily, ...parsed.daily },
                achievements: parsed.achievements ?? {},
                recent: parsed.recent ?? [],
                timeByDay,
                solveByDay: parsed.solveByDay ?? {},
                focusByDay: parsed.focusByDay ?? {},
                focusByTabDay: parsed.focusByTabDay ?? {},
                goals: parsed.goals ?? {},
                goalDays: parsed.goalDays ?? {},
            }
        }
    } catch {
        /* fall through */
    }
    return freshState()
}

// Module-level singletons so all components share one profile.
const state = ref<State>(load())
// The tab/view currently in focus, so wall-clock time can be attributed to it.
const activeTab = ref<string>('TimerTab')
const setActiveTab = (tab: string) => {
    activeTab.value = tab
}
const toasts = ref<Toast[]>([])
let toastSeq = 0
let quiet = false // suppress toasts (used during bulk backfill)

const persist = () => localStorage.setItem(STORE_KEY, JSON.stringify(state.value))

const notify = (t: Omit<Toast, 'id'>) => {
    if (quiet) return
    const id = ++toastSeq
    toasts.value = [...toasts.value, { ...t, id }]
    setTimeout(() => {
        toasts.value = toasts.value.filter((x) => x.id !== id)
    }, 5000)
}
const dismissToast = (id: number) => {
    toasts.value = toasts.value.filter((x) => x.id !== id)
}

const addXp = (amount: number) => {
    if (amount <= 0) return
    const before = levelInfo(state.value.xp).level
    state.value.xp += amount
    const after = levelInfo(state.value.xp).level
    if (after > before) {
        notify({ kind: 'level', icon: '🌟', title: `Level ${after}!`, sub: 'You leveled up' })
    }
}

const ensureDaily = () => {
    const today = dayKey()
    if (state.value.daily.date !== today) {
        state.value.daily = { date: today, items: pickDaily(today) }
    }
}

const bumpStreak = () => {
    const today = dayKey()
    const s = state.value.streak
    if (s.lastActive === today) return
    if (isYesterday(s.lastActive)) s.current += 1
    else s.current = 1
    s.lastActive = today
    if (s.current > s.longest) s.longest = s.current
    if ([3, 7, 14, 30, 50, 100].includes(s.current)) {
        notify({ kind: 'streak', icon: '🔥', title: `${s.current}-day streak!`, sub: 'Keep it alive tomorrow' })
    }
}

// ---- daily time + goals --------------------------------------------------
const addTime = (cat: ActivityType, ms: number, dateKey = dayKey()) => {
    if (!ms || ms <= 0) return
    const day = (state.value.timeByDay[dateKey] ??= {})
    day[cat] = (day[cat] ?? 0) + ms
}
const addSolveTime = (cube: string, ms: number, dateKey = dayKey()) => {
    if (!ms || ms <= 0) return
    const day = (state.value.solveByDay[dateKey] ??= {})
    day[cube] = (day[cube] ?? 0) + ms
}
const daySolveTotal = (dateKey: string): number =>
    Object.values(state.value.solveByDay[dateKey] ?? {}).reduce((a, ms) => a + (ms ?? 0), 0)

// Time logged today for any goal target (a category, 'solve' total, or 'focus').
const categoryTimeToday = (cat: GoalKey, today = dayKey()): number => {
    if (cat === 'focus') return state.value.focusByDay[today] ?? 0
    if (cat === 'solve') return daySolveTotal(today)
    return state.value.timeByDay[today]?.[cat] ?? 0
}

const labelFor = (cat: GoalKey): string =>
    cat === 'focus' ? 'focused' : TIME_CATEGORIES.find((c) => c.id === cat)?.label ?? cat

const checkGoal = (cat: GoalKey) => {
    const goalMin = state.value.goals[cat]
    if (!goalMin) return
    const today = dayKey()
    const credited = (state.value.goalDays[today] ??= [])
    if (categoryTimeToday(cat, today) >= goalMin * 60000 && !credited.includes(cat)) {
        credited.push(cat)
        const xp = Math.min(80, Math.max(20, Math.round(goalMin * 2)))
        addXp(xp)
        notify({ kind: 'goal', icon: '🎯', title: 'Daily goal reached', sub: `${goalMin}m ${labelFor(cat)} · +${xp} XP` })
    }
}

// Accrue focused wall-clock time (driven by useFocusTracker).
const addFocus = (ms: number) => {
    if (!ms || ms <= 0) return
    const today = dayKey()
    state.value.focusByDay[today] = (state.value.focusByDay[today] ?? 0) + ms
    const tabDay = (state.value.focusByTabDay[today] ??= {})
    tabDay[activeTab.value] = (tabDay[activeTab.value] ?? 0) + ms
    if (state.value.streak.lastActive !== today) bumpStreak()
    checkGoal('focus')
    persist()
}

// Today's auto-tracked value (ms) for a routine task source. 'focus' reads
// wall-clock focus time; 'solve' reads solving time (optionally for one cube);
// any activity category reads its practice time. Used by the Routine tab to
// drive live progress without duplicating the per-day bookkeeping here.
const metricTodayValue = (source: string, cube?: string | null): number => {
    const today = dayKey()
    if (source === 'focus') return state.value.focusByDay[today] ?? 0
    if (source === 'solve') {
        const day = state.value.solveByDay[today] ?? {}
        if (cube) return day[cube] ?? 0
        return Object.values(day).reduce((a, ms) => a + (ms ?? 0), 0)
    }
    return state.value.timeByDay[today]?.[source as ActivityType] ?? 0
}

const snapshot = (): AchievementSnapshot => ({
    solves: state.value.totals.solves,
    crossReps: state.value.totals.cross,
    inspectionReps: state.value.totals.inspection,
    memoCorrect: state.value.totals.memoCorrect,
    algReps: state.value.totals.alg,
    bestSingleMs: state.value.totals.bestSingleMs,
    bestAo12Ms: state.value.totals.bestAo12Ms,
    streakLongest: state.value.streak.longest,
})

const evaluateAchievements = () => {
    const snap = snapshot()
    for (const a of ACHIEVEMENTS) {
        if (state.value.achievements[a.id]) continue
        if (a.progress(snap) >= a.target) {
            state.value.achievements[a.id] = new Date().toISOString()
            addXp(a.xp)
            notify({ kind: 'achievement', icon: a.icon, title: a.title, sub: `Achievement · +${a.xp} XP` })
        }
    }
}

const ingest = (e: GameEvent) => {
    ensureDaily()
    const t = state.value.totals

    if (e.type === 'solve' && e.penalty !== 'DNF' && e.timeMs != null) {
        t.solves++
        const eff = e.penalty === '+2' ? e.timeMs + 2000 : e.timeMs
        if (t.bestSingleMs === null || eff < t.bestSingleMs) t.bestSingleMs = eff
        state.value.recent = [eff, ...state.value.recent].slice(0, 12)
        const a = ao12Of(state.value.recent)
        if (a !== null) {
            e.ao12Ms = a
            if (t.bestAo12Ms === null || a < t.bestAo12Ms) t.bestAo12Ms = a
        }
    } else if (e.type === 'cross') {
        t.cross++
    } else if (e.type === 'inspection') {
        t.inspection++
    } else if (e.type === 'memo') {
        t.memo++
        if (e.success) t.memoCorrect++
    } else if (e.type === 'alg') {
        t.alg++
    }

    addXp(baseXp(e))
    if (e.isPB && e.timeMs != null) {
        addXp(PB_XP)
        notify({ kind: 'pb', icon: '🏆', title: 'New personal best!', sub: `${formatMs(e.timeMs)}s · +${PB_XP} XP` })
    }

    bumpStreak()

    if (e.timeMs && e.timeMs > 0) {
        if (e.type === 'solve') {
            addSolveTime(e.cube ?? '3x3', e.timeMs)
            checkGoal('solve')
        } else {
            addTime(e.type, e.timeMs)
            checkGoal(e.type)
        }
    }

    for (const item of state.value.daily.items) {
        if (item.done) continue
        const tpl = DAILY_POOL.find((x) => x.id === item.id)
        if (!tpl) continue
        const d = tpl.delta(e)
        if (d > 0) {
            item.progress = Math.min(tpl.target, item.progress + d)
            if (item.progress >= tpl.target) {
                item.done = true
                addXp(tpl.xp)
                notify({ kind: 'daily', icon: tpl.icon, title: 'Daily challenge complete', sub: `${tpl.title} · +${tpl.xp} XP` })
            }
        }
    }

    evaluateAchievements()
    persist()
}

// ---- streak recomputed from the set of active days (used by backfill) ----
const activeDayKeys = (): string[] => {
    const set = new Set<string>([
        ...Object.keys(state.value.timeByDay),
        ...Object.keys(state.value.solveByDay),
        ...Object.keys(state.value.focusByDay),
    ])
    return [...set].sort()
}

const recomputeStreakFromDays = () => {
    const days = activeDayKeys()
    if (!days.length) return
    let longest = 1
    let run = 1
    for (let i = 1; i < days.length; i++) {
        if (consecutiveDays(days[i - 1]!, days[i]!)) {
            run++
            longest = Math.max(longest, run)
        } else {
            run = 1
        }
    }
    const set = new Set(days)
    const today = dayKey()
    let cursor: string | null = set.has(today) ? today : set.has(prevDayKey(today)) ? prevDayKey(today) : null
    let current = 0
    while (cursor && set.has(cursor)) {
        current++
        cursor = prevDayKey(cursor)
    }
    state.value.streak.longest = Math.max(state.value.streak.longest, longest, current)
    state.value.streak.current = current
    state.value.streak.lastActive = days[days.length - 1]!
}

// Rebuild solve-derived totals, bests and per-cube/per-day solving time from a
// full solve history. Idempotent. Focused time and drill time are preserved.
const backfillFromSolves = (solves: SolveRecord[]) => {
    const sorted = [...solves]
        .filter((s) => typeof s.time === 'number')
        .sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime())

    const t = state.value.totals
    t.solves = 0
    t.bestSingleMs = null
    t.bestAo12Ms = null
    state.value.solveByDay = {} // fully rebuilt below, so a re-run isn't additive

    const recent: number[] = []
    for (const s of sorted) {
        const penalty = s.penalty ?? 'OK'
        if (penalty !== 'DNF') {
            t.solves++
            const eff = penalty === '+2' ? s.time + 2000 : s.time
            if (t.bestSingleMs === null || eff < t.bestSingleMs) t.bestSingleMs = eff
            recent.unshift(eff)
            if (recent.length > 12) recent.pop()
            const a = ao12Of(recent)
            if (a !== null && (t.bestAo12Ms === null || a < t.bestAo12Ms)) t.bestAo12Ms = a
        }
        if (s.date) addSolveTime(s.cube || 'Unknown', s.time, dayKey(new Date(s.date)))
    }

    quiet = true
    recomputeStreakFromDays()
    evaluateAchievements()
    checkGoal('solve')
    checkGoal('focus')
    for (const c of TIME_CATEGORIES) checkGoal(c.id)
    quiet = false

    persist()
    const summary = { solves: t.solves, days: Object.keys(state.value.solveByDay).length }
    notify({ kind: 'achievement', icon: '📥', title: 'Backfill complete', sub: `${summary.solves} solves · ${summary.days} active days` })
    return summary
}

const fetchAllSolves = async (): Promise<SolveRecord[]> => {
    const res = await api.get('/sessions')
    const sessions = (res.data ?? []) as { cube?: string | null; solves?: SolveRecord[] }[]
    return sessions.flatMap((s) => (s.solves ?? []).map((solve) => ({ ...solve, cube: s.cube ?? null })))
}

const backfillNow = async () => backfillFromSolves(await fetchAllSolves())

// Expose backfill helpers as runnable console "scripts".
if (typeof window !== 'undefined') {
    const w = window as unknown as Record<string, unknown>
    w.cubeBackfill = backfillNow
    w.cubeApplyBackfill = (solves: SolveRecord[]) => backfillFromSolves(solves)
}

export { addFocus, setActiveTab, metricTodayValue }

export function useGamification() {
    ensureDaily()

    const level = computed(() => levelInfo(state.value.xp))

    const dailyChallenges = computed(() =>
        state.value.daily.items.map((item) => {
            const tpl = DAILY_POOL.find((x) => x.id === item.id)!
            return {
                id: item.id, icon: tpl.icon, title: tpl.title, desc: tpl.desc,
                target: tpl.target, xp: tpl.xp, progress: item.progress, done: item.done,
            }
        }),
    )

    const achievementsView = computed(() => {
        const snap = snapshot()
        return ACHIEVEMENTS.map((a) => ({
            ...a,
            progress: Math.min(a.target, a.progress(snap)),
            unlocked: !!state.value.achievements[a.id],
            unlockedAt: state.value.achievements[a.id] ?? null,
        }))
    })

    const unlockedCount = computed(() => Object.keys(state.value.achievements).length)

    const goalView = (cat: GoalKey, label: string, icon: string) => {
        const todayMs = categoryTimeToday(cat)
        const goalMin = state.value.goals[cat] ?? 0
        return {
            id: cat, label, icon, todayMs, goalMin,
            done: goalMin > 0 && todayMs >= goalMin * 60000,
            pct: goalMin > 0 ? Math.min(100, (todayMs / (goalMin * 60000)) * 100) : 0,
        }
    }

    // Activity practice-time goals (Solving total, Algorithms, Cross, ...).
    const timeGoals = computed(() => TIME_CATEGORIES.map((c) => goalView(c.id, c.label, c.icon)))

    // Focused wall-clock time goal.
    const focusGoal = computed(() => goalView('focus', 'Focused', '🎯'))

    // Today's solving time per puzzle, biggest first.
    const solveByCubeToday = computed(() => {
        const today = state.value.solveByDay[dayKey()] ?? {}
        return Object.entries(today)
            .map(([cube, ms]) => ({ cube, ms: ms ?? 0 }))
            .sort((a, b) => b.ms - a.ms)
    })

    const todayTotalMs = computed(() => {
        const today = dayKey()
        const others = Object.values(state.value.timeByDay[today] ?? {}).reduce((a, ms) => a + (ms ?? 0), 0)
        return daySolveTotal(today) + others
    })
    const todayFocusMs = computed(() => state.value.focusByDay[dayKey()] ?? 0)

    // --- Lifetime time accounting (across all recorded days) --------------
    const TAB_LABELS: Record<string, string> = {
        TimerTab: 'Timer',
        StatsTab: 'Stats',
        AlgorithmsTab: 'Algorithms',
        DrillsTab: 'Drills',
        QuestsTab: 'Quests',
        RoutineTab: 'Routine',
    }

    // Total focused wall-clock time per tab/view, biggest first.
    const focusByTab = computed(() => {
        const totals: Record<string, number> = {}
        for (const day of Object.values(state.value.focusByTabDay)) {
            for (const [tab, ms] of Object.entries(day)) {
                totals[tab] = (totals[tab] ?? 0) + (ms ?? 0)
            }
        }
        return Object.entries(totals)
            .map(([tab, ms]) => ({ tab, label: TAB_LABELS[tab] ?? tab, ms }))
            .sort((a, b) => b.ms - a.ms)
    })

    const focusTotalMs = computed(() =>
        Object.values(state.value.focusByDay).reduce((a, ms) => a + (ms ?? 0), 0),
    )

    // Total recorded solving time (sum of solve durations) across all days.
    const solveTimeTotalMs = computed(() =>
        Object.values(state.value.solveByDay).reduce(
            (a, day) => a + Object.values(day).reduce((b, ms) => b + (ms ?? 0), 0),
            0,
        ),
    )

    // Lifetime active-practice time per activity category (Solving, Alg, ...).
    const timeByCategoryTotal = computed(() => {
        const totals: Partial<Record<ActivityType, number>> = {}
        for (const day of Object.values(state.value.timeByDay)) {
            for (const [cat, ms] of Object.entries(day)) {
                totals[cat as ActivityType] = (totals[cat as ActivityType] ?? 0) + (ms ?? 0)
            }
        }
        return TIME_CATEGORIES.map((c) => ({
            id: c.id,
            label: c.label,
            icon: c.icon,
            ms: c.id === 'solve' ? solveTimeTotalMs.value : totals[c.id] ?? 0,
        })).sort((a, b) => b.ms - a.ms)
    })

    // --- tracking API (called from the various trainers) ------------------
    const trackSolve = (timeMs: number, penalty: 'OK' | '+2' | 'DNF', cube?: string) => {
        const e: GameEvent = { type: 'solve', timeMs, penalty, cube }
        if (penalty !== 'DNF') {
            const eff = penalty === '+2' ? timeMs + 2000 : timeMs
            const prev = state.value.totals.bestSingleMs
            if (prev !== null && eff < prev) e.isPB = true
        }
        ingest(e)
    }
    const trackCross = (timeMs: number) => ingest({ type: 'cross', timeMs })
    const trackInspection = (timeMs: number, penalty: 'OK' | '+2' | 'DNF') =>
        ingest({ type: 'inspection', timeMs, penalty })
    const trackMemo = (success: boolean, timeMs = 0) => ingest({ type: 'memo', success, timeMs })
    const trackAlg = (timeMs: number) => ingest({ type: 'alg', timeMs })
    const track = (type: ActivityType) => ingest({ type })

    const setGoal = (cat: GoalKey, minutes: number) => {
        const m = Math.max(0, Math.min(600, Math.round(minutes || 0)))
        if (m === 0) delete state.value.goals[cat]
        else state.value.goals[cat] = m
        persist()
        if (m > 0) checkGoal(cat)
    }

    const resetProgress = () => {
        state.value = freshState()
        ensureDaily()
        persist()
    }

    return {
        state,
        level,
        streak: computed(() => state.value.streak),
        totals: computed(() => state.value.totals),
        dailyChallenges,
        achievementsView,
        unlockedCount,
        timeGoals,
        focusGoal,
        solveByCubeToday,
        todayTotalMs,
        todayFocusMs,
        focusByTab,
        focusTotalMs,
        solveTimeTotalMs,
        timeByCategoryTotal,
        setActiveTab,
        toasts,
        dismissToast,
        trackSolve,
        trackCross,
        trackInspection,
        trackMemo,
        trackAlg,
        track,
        setGoal,
        backfillNow,
        resetProgress,
    }
}
