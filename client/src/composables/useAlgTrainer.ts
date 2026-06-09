import { ref, computed } from 'vue'
import { algorithms, algorithmsBySet, type AlgSet, type Algorithm } from '@/data/algorithms'
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
        pickNext,
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
