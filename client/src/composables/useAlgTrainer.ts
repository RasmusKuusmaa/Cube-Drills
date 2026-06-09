import { ref, computed } from 'vue'
import { algorithms, algorithmsBySet, effectivePar, type AlgSet, type Algorithm } from '@/data/algorithms'
import { invertScramble, randomAuf } from '@/utils/notation'

export type CaseStat = {
    attempts: number
    best: number | null
    times: number[] // most-recent first, capped
}

type StatsMap = Record<string, CaseStat>

const POOL_KEY = 'algTrainer.pool'
const STATS_KEY = 'algTrainer.stats'
const MAX_TIMES = 50

const defaultPool = (): Set<string> => new Set(algorithmsBySet('PLL').map((a) => a.id))

const loadPool = (): Set<string> => {
    try {
        const raw = localStorage.getItem(POOL_KEY)
        if (raw) {
            const ids: string[] = JSON.parse(raw)
            const valid = ids.filter((id) => algorithms.some((a) => a.id === id))
            if (valid.length) return new Set(valid)
        }
    } catch {
        /* fall through to default */
    }
    return defaultPool()
}

const loadStats = (): StatsMap => {
    try {
        const raw = localStorage.getItem(STATS_KEY)
        if (raw) return JSON.parse(raw)
    } catch {
        /* ignore */
    }
    return {}
}

// Module-level so progress survives tab switches (the tab component unmounts).
const pool = ref<Set<string>>(loadPool())
const stats = ref<StatsMap>(loadStats())
const currentId = ref<string | null>(null)
const aufEnabled = ref<boolean>(false)
const sessionTimes = ref<number[]>([])

const persistPool = () => localStorage.setItem(POOL_KEY, JSON.stringify([...pool.value]))
const persistStats = () => localStorage.setItem(STATS_KEY, JSON.stringify(stats.value))

const byId = (id: string | null): Algorithm | null =>
    id ? algorithms.find((a) => a.id === id) ?? null : null

// WCA-style ao12 (trim best & worst, mean the middle 10) over the 12 most-recent
// times. Returns null until 12 solves of the case exist.
export const ao12Of = (times: number[]): number | null => {
    if (times.length < 12) return null
    const last = [...times.slice(0, 12)].sort((a, b) => a - b)
    const middle = last.slice(1, last.length - 1)
    return middle.reduce((a, t) => a + t, 0) / middle.length
}

export type CaseMetric = {
    // ao12 once 12 solves exist, otherwise a provisional mean of what's recorded.
    value: number | null
    samples: number
    provisional: boolean
}

const metricOf = (id: string): CaseMetric => {
    const times = stats.value[id]?.times ?? []
    const ao = ao12Of(times)
    if (ao !== null) return { value: ao, samples: times.length, provisional: false }
    if (times.length) {
        const mean = times.reduce((a, t) => a + t, 0) / times.length
        return { value: mean, samples: times.length, provisional: true }
    }
    return { value: null, samples: 0, provisional: true }
}

export type RankRow = {
    case: Algorithm
    par: number
    metric: CaseMetric
    // value / par: >1 means slower than the case's target. null when no data.
    ratio: number | null
}

export function useAlgTrainer(set: AlgSet = 'PLL') {
    const allCases = computed(() => algorithmsBySet(set))
    const poolCases = computed(() => allCases.value.filter((a) => pool.value.has(a.id)))

    const current = computed(() => byId(currentId.value))

    // Setup scramble = inverse of the algorithm, optionally with a random AUF
    // prefix to vary the recognition angle.
    const currentSetup = ref('')
    const buildSetup = (alg: Algorithm | null) => {
        if (!alg) {
            currentSetup.value = ''
            return
        }
        const inverse = invertScramble(alg.alg)
        const auf = aufEnabled.value ? randomAuf() : ''
        currentSetup.value = (auf ? `${auf} ${inverse}` : inverse).trim()
    }

    const pickNext = () => {
        const list = poolCases.value
        if (list.length === 0) {
            currentId.value = null
            currentSetup.value = ''
            return
        }
        let next = list[Math.floor(Math.random() * list.length)]!
        // Avoid repeating the same case twice in a row when possible.
        let guard = 0
        while (list.length > 1 && next.id === currentId.value && guard < 10) {
            next = list[Math.floor(Math.random() * list.length)]!
            guard++
        }
        currentId.value = next.id
        buildSetup(next)
    }

    // Cases ranked slowest-relative-to-par first; unmeasured cases sort last so
    // the list reads as "your slowest known cases".
    const ranking = computed<RankRow[]>(() =>
        poolCases.value
            .map((c) => {
                const par = effectivePar(c)
                const metric = metricOf(c.id)
                const ratio = metric.value !== null ? metric.value / par : null
                return { case: c, par, metric, ratio }
            })
            .sort((a, b) => {
                if (a.ratio === null && b.ratio === null) return 0
                if (a.ratio === null) return 1
                if (b.ratio === null) return -1
                return b.ratio - a.ratio
            }),
    )

    // Pick the next case weighted toward the slowest-relative-to-par cases.
    // Unmeasured cases get a boost so a full per-case ao12 builds up over time.
    // `eligibleIds`, when given, restricts selection (e.g. "focus on worst 3").
    const pickWeakest = (eligibleIds?: string[]) => {
        let list = poolCases.value
        if (eligibleIds && eligibleIds.length) {
            const set = new Set(eligibleIds)
            const filtered = list.filter((c) => set.has(c.id))
            if (filtered.length) list = filtered
        }
        if (list.length === 0) {
            currentId.value = null
            currentSetup.value = ''
            return
        }
        const weights = list.map((c) => {
            const m = metricOf(c.id)
            let w = 1 // floor: every eligible case can still come up
            if (m.value === null) {
                w += 6 // no baseline yet — prioritize measuring it
            } else {
                const ratio = m.value / effectivePar(c)
                w += Math.max(0, ratio - 1) * 5 // the slower vs par, the heavier
                if (m.samples < 12) w += (12 - m.samples) * 0.25 // top up toward ao12
            }
            return w
        })
        const total = weights.reduce((a, w) => a + w, 0)
        const pick = (): Algorithm => {
            let r = Math.random() * total
            for (let i = 0; i < list.length; i++) {
                r -= weights[i]!
                if (r <= 0) return list[i]!
            }
            return list[list.length - 1]!
        }
        let next = pick()
        let guard = 0
        while (list.length > 1 && next.id === currentId.value && guard < 8) {
            next = pick()
            guard++
        }
        currentId.value = next.id
        buildSetup(next)
    }

    const recordTime = (ms: number) => {
        if (!currentId.value) return
        const id = currentId.value
        const prev = stats.value[id] ?? { attempts: 0, best: null, times: [] }
        const updated: CaseStat = {
            attempts: prev.attempts + 1,
            best: prev.best === null ? ms : Math.min(prev.best, ms),
            times: [ms, ...prev.times].slice(0, MAX_TIMES),
        }
        stats.value = { ...stats.value, [id]: updated }
        sessionTimes.value = [ms, ...sessionTimes.value]
        persistStats()
    }

    const statFor = (id: string): CaseStat | null => stats.value[id] ?? null

    const toggleCase = (id: string) => {
        const next = new Set(pool.value)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        pool.value = next
        persistPool()
    }

    const setPool = (ids: string[]) => {
        pool.value = new Set(ids)
        persistPool()
    }

    const selectAll = () => setPool(allCases.value.map((a) => a.id))
    const selectNone = () => setPool([])
    const selectTwoLook = () => setPool(allCases.value.filter((a) => a.twoLook).map((a) => a.id))

    const resetStats = () => {
        stats.value = {}
        sessionTimes.value = []
        persistStats()
    }

    const toggleAuf = () => {
        aufEnabled.value = !aufEnabled.value
        buildSetup(current.value)
    }

    return {
        allCases,
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
    }
}
