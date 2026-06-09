import { computed, ref } from 'vue'
import {
    ACHIEVEMENTS,
    DAILY_COUNT,
    DAILY_POOL,
    PB_XP,
    baseXp,
    levelInfo,
    type AchievementSnapshot,
    type ActivityType,
    type GameEvent,
} from '@/data/gamification'
import { formatMs } from '@/utils/solves'

const STORE_KEY = 'gamification.v1'

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
}

export type Toast = {
    id: number
    kind: 'level' | 'pb' | 'daily' | 'achievement' | 'streak'
    icon: string
    title: string
    sub: string
}

// ---- date helpers --------------------------------------------------------
const dayKey = (d = new Date()): string => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}
const isYesterday = (key: string): boolean => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return dayKey(d) === key
}

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
    // Fisher–Yates with the seeded RNG.
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
})

const load = (): State => {
    try {
        const raw = localStorage.getItem(STORE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw)
            // Shallow-merge onto defaults so older saves tolerate new fields.
            const base = freshState()
            return {
                ...base,
                ...parsed,
                totals: { ...base.totals, ...parsed.totals },
                streak: { ...base.streak, ...parsed.streak },
                daily: { ...base.daily, ...parsed.daily },
                achievements: parsed.achievements ?? {},
                recent: parsed.recent ?? [],
            }
        }
    } catch {
        /* fall through */
    }
    return freshState()
}

// Module-level singletons so all components share one profile.
const state = ref<State>(load())
const toasts = ref<Toast[]>([])
let toastSeq = 0

const persist = () => localStorage.setItem(STORE_KEY, JSON.stringify(state.value))

const notify = (t: Omit<Toast, 'id'>) => {
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

export function useGamification() {
    ensureDaily()

    const level = computed(() => levelInfo(state.value.xp))

    const dailyChallenges = computed(() =>
        state.value.daily.items.map((item) => {
            const tpl = DAILY_POOL.find((x) => x.id === item.id)!
            return {
                id: item.id,
                icon: tpl.icon,
                title: tpl.title,
                desc: tpl.desc,
                target: tpl.target,
                xp: tpl.xp,
                progress: item.progress,
                done: item.done,
            }
        }),
    )

    const achievementsView = computed(() => {
        const snap = snapshot()
        return ACHIEVEMENTS.map((a) => {
            const unlockedAt = state.value.achievements[a.id] ?? null
            const progress = Math.min(a.target, a.progress(snap))
            return {
                ...a,
                progress,
                unlocked: !!unlockedAt,
                unlockedAt,
            }
        })
    })

    const unlockedCount = computed(() => Object.keys(state.value.achievements).length)

    // --- tracking API (called from the various trainers) ------------------
    const trackSolve = (timeMs: number, penalty: 'OK' | '+2' | 'DNF', _event?: string) => {
        const e: GameEvent = { type: 'solve', timeMs, penalty }
        if (penalty !== 'DNF') {
            const eff = penalty === '+2' ? timeMs + 2000 : timeMs
            // Only a PB once a baseline exists, so the first-ever solve is silent.
            const prev = state.value.totals.bestSingleMs
            if (prev !== null && eff < prev) e.isPB = true
        }
        ingest(e)
    }
    const trackCross = (timeMs: number) => ingest({ type: 'cross', timeMs })
    const trackInspection = (timeMs: number, penalty: 'OK' | '+2' | 'DNF') =>
        ingest({ type: 'inspection', timeMs, penalty })
    const trackMemo = (success: boolean) => ingest({ type: 'memo', success })
    const trackAlg = (timeMs: number) => ingest({ type: 'alg', timeMs })
    const track = (type: ActivityType) => ingest({ type })

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
        toasts,
        dismissToast,
        trackSolve,
        trackCross,
        trackInspection,
        trackMemo,
        trackAlg,
        track,
        resetProgress,
    }
}
