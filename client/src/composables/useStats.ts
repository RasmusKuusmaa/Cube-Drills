import { computed, type ComputedRef } from 'vue'
import { effectiveTime, type Penalty } from '@/utils/solves'

type Solve = {
    id: string
    time: number
    scramble: string
    date: string
    penalty?: Penalty
    comment?: string | null
}

export type AverageRow = {
    label: string
    size: number
    current: number | null
    best: number | null
}

export type SubXRow = {
    threshold: number // in ms
    count: number
    percent: number
}

export type HistogramBucket = {
    from: number // ms
    to: number // ms
    count: number
}

export type TrendPoint = {
    index: number
    single: number
    ao5: number | null
    ao12: number | null
}

export type PbPoint = {
    index: number
    value: number
    date: string
}

// WCA-style trimmed mean. removeCount items are dropped from each end before
// averaging. A window that still contains a DNF (Infinity) after trimming
// resolves to Infinity, which callers render as "DNF".
const trimmedMean = (times: number[], removeCount: number): number | null => {
    if (times.length === 0) return null
    if (times.length <= removeCount * 2) return null
    const sorted = [...times].sort((a, b) => a - b)
    const trimmed = sorted.slice(removeCount, sorted.length - removeCount)
    const sum = trimmed.reduce((acc, t) => acc + t, 0)
    return sum / trimmed.length
}

const mean = (times: number[]): number | null => {
    if (times.length === 0) return null
    return times.reduce((acc, t) => acc + t, 0) / times.length
}

// Matches the app's existing convention (see useAverages): mo3 is a plain mean,
// every aoN trims one solve from each end.
const removeCountFor = (size: number): number => (size >= 5 ? 1 : 0)

const currentAverage = (times: number[], size: number): number | null => {
    if (times.length < size) return null
    return trimmedMean(times.slice(0, size), removeCountFor(size))
}

const bestAverage = (times: number[], size: number): number | null => {
    if (times.length < size) return null
    const removeCount = removeCountFor(size)
    let best: number | null = null
    for (let i = 0; i + size <= times.length; i++) {
        const window = times.slice(i, i + size)
        const avg = trimmedMean(window, removeCount)
        if (avg !== null && Number.isFinite(avg) && (best === null || avg < best)) {
            best = avg
        }
    }
    return best
}

const AVERAGE_SIZES: { label: string; size: number }[] = [
    { label: 'mo3', size: 3 },
    { label: 'ao5', size: 5 },
    { label: 'ao12', size: 12 },
    { label: 'ao50', size: 50 },
    { label: 'ao100', size: 100 },
    { label: 'ao1000', size: 1000 },
]

export function useStats(solves: ComputedRef<Solve[]>) {
    // solves are newest-first; effective times fold in +2/DNF penalties.
    const effectiveNewest = computed(() => solves.value.map(effectiveTime))
    const effectiveChrono = computed(() => [...effectiveNewest.value].reverse())
    const finite = computed(() => effectiveNewest.value.filter((t) => Number.isFinite(t)))

    const counts = computed(() => {
        const total = solves.value.length
        let dnf = 0
        let plusTwo = 0
        for (const s of solves.value) {
            if (s.penalty === 'DNF') dnf++
            else if (s.penalty === '+2') plusTwo++
        }
        const completed = total - dnf
        return {
            total,
            completed,
            dnf,
            plusTwo,
            ok: total - dnf - plusTwo,
            dnfRate: total ? dnf / total : 0,
            plusTwoRate: total ? plusTwo / total : 0,
        }
    })

    const best = computed(() => (finite.value.length ? Math.min(...finite.value) : null))
    const worst = computed(() => (finite.value.length ? Math.max(...finite.value) : null))
    const meanAll = computed(() => mean(finite.value))
    const median = computed(() => {
        if (finite.value.length === 0) return null
        const sorted = [...finite.value].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
    })
    const stdDev = computed(() => {
        const m = meanAll.value
        if (m === null || finite.value.length < 2) return null
        const variance =
            finite.value.reduce((acc, t) => acc + (t - m) ** 2, 0) / finite.value.length
        return Math.sqrt(variance)
    })
    const spread = computed(() =>
        best.value !== null && worst.value !== null ? worst.value - best.value : null,
    )
    // Coefficient of variation: how consistent the solver is, mean-independent.
    const consistency = computed(() =>
        stdDev.value !== null && meanAll.value ? stdDev.value / meanAll.value : null,
    )

    const bestSolve = computed(() => {
        if (best.value === null) return null
        return solves.value.find((s) => effectiveTime(s) === best.value) ?? null
    })

    const totalPracticeMs = computed(() =>
        solves.value.reduce((acc, s) => acc + (Number.isFinite(s.time) ? s.time : 0), 0),
    )

    const averages = computed<AverageRow[]>(() =>
        AVERAGE_SIZES.map(({ label, size }) => ({
            label,
            size,
            current: currentAverage(effectiveNewest.value, size),
            best: bestAverage(effectiveNewest.value, size),
        })),
    )

    // Activity span derived from solve timestamps.
    const activity = computed(() => {
        const dates = solves.value
            .map((s) => new Date(s.date))
            .filter((d) => !Number.isNaN(d.getTime()))
        if (dates.length === 0) {
            return { first: null, last: null, activeDays: 0, perDay: 0 }
        }
        const times = dates.map((d) => d.getTime())
        const first = new Date(Math.min(...times))
        const last = new Date(Math.max(...times))
        const dayKeys = new Set(dates.map((d) => d.toDateString()))
        const activeDays = dayKeys.size
        return {
            first,
            last,
            activeDays,
            perDay: activeDays ? solves.value.length / activeDays : 0,
        }
    })

    // Longest / current run of consecutive non-DNF solves (chronological).
    const streaks = computed(() => {
        let longest = 0
        let run = 0
        const chronoSolves = [...solves.value].reverse()
        for (const s of chronoSolves) {
            if (s.penalty === 'DNF') {
                run = 0
            } else {
                run++
                if (run > longest) longest = run
            }
        }
        // current streak = trailing run from the newest solve
        let current = 0
        for (const s of solves.value) {
            if (s.penalty === 'DNF') break
            current++
        }
        return { longest, current }
    })

    // Sub-X breakdown at whole-second thresholds that actually split the data.
    const subX = computed<SubXRow[]>(() => {
        if (best.value === null || finite.value.length === 0) return []
        const total = finite.value.length
        const startSec = Math.floor(best.value / 1000) + 1
        const endSec = Math.ceil((worst.value ?? best.value) / 1000)
        const rows: SubXRow[] = []
        for (let sec = startSec; sec <= endSec && rows.length < 8; sec++) {
            const threshold = sec * 1000
            const count = finite.value.filter((t) => t < threshold).length
            if (count > 0 && count < total) {
                rows.push({ threshold, count, percent: count / total })
            }
        }
        return rows
    })

    // Histogram of single times, ~12 evenly spaced buckets.
    const histogram = computed<HistogramBucket[]>(() => {
        if (finite.value.length === 0 || best.value === null || worst.value === null) return []
        const min = best.value
        const max = worst.value
        if (max === min) return [{ from: min, to: max, count: finite.value.length }]
        const bucketCount = Math.min(12, finite.value.length)
        const size = (max - min) / bucketCount
        const buckets: HistogramBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
            from: min + i * size,
            to: min + (i + 1) * size,
            count: 0,
        }))
        for (const t of finite.value) {
            let idx = Math.floor((t - min) / size)
            if (idx >= bucketCount) idx = bucketCount - 1
            if (idx < 0) idx = 0
            buckets[idx]!.count++
        }
        return buckets
    })

    // Chronological trend: each completed solve plus rolling ao5 / ao12.
    const trend = computed<TrendPoint[]>(() => {
        const chrono = effectiveChrono.value
        return chrono
            .map((single, index) => {
                if (!Number.isFinite(single)) return null
                const ao5Window = index >= 4 ? chrono.slice(index - 4, index + 1) : null
                const ao12Window = index >= 11 ? chrono.slice(index - 11, index + 1) : null
                const ao5 = ao5Window ? trimmedMean(ao5Window, 1) : null
                const ao12 = ao12Window ? trimmedMean(ao12Window, 1) : null
                return {
                    index,
                    single,
                    ao5: ao5 !== null && Number.isFinite(ao5) ? ao5 : null,
                    ao12: ao12 !== null && Number.isFinite(ao12) ? ao12 : null,
                }
            })
            .filter((p): p is TrendPoint => p !== null)
    })

    // Personal-best progression: points where a new best single was set.
    const pbProgression = computed<PbPoint[]>(() => {
        const chronoSolves = [...solves.value].reverse()
        const points: PbPoint[] = []
        let running = Infinity
        chronoSolves.forEach((s, index) => {
            const t = effectiveTime(s)
            if (Number.isFinite(t) && t < running) {
                running = t
                points.push({ index, value: t, date: s.date })
            }
        })
        return points
    })

    // Solves per weekday (Sun..Sat) for activity patterns.
    const weekdays = computed(() => {
        const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const buckets = labels.map((label) => ({ label, count: 0 }))
        for (const s of solves.value) {
            const d = new Date(s.date)
            if (!Number.isNaN(d.getTime())) buckets[d.getDay()]!.count++
        }
        return buckets
    })

    // Net improvement: oldest available ao12 vs the most recent ao12.
    const improvement = computed(() => {
        const chrono = effectiveChrono.value
        if (chrono.length < 12) return null
        const firstAo12 = trimmedMean(chrono.slice(0, 12), 1)
        const lastAo12 = trimmedMean(chrono.slice(chrono.length - 12), 1)
        if (
            firstAo12 === null ||
            lastAo12 === null ||
            !Number.isFinite(firstAo12) ||
            !Number.isFinite(lastAo12)
        ) {
            return null
        }
        return { from: firstAo12, to: lastAo12, delta: lastAo12 - firstAo12 }
    })

    const hasData = computed(() => solves.value.length > 0)

    return {
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
    }
}
