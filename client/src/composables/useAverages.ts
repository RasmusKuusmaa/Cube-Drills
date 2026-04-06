import { computed, type ComputedRef } from 'vue'

type Solve = {
    id: string
    time: number
    scramble: string
    date: string
    penalty?: 'OK' | '+2' | 'DNF'
}

const formatTime = (time: number): string => {
    return (time / 1000).toFixed(2)
}

const calculateAverage = (times: number[], removeCount: number = 0): number | null => {
    if (times.length < 3) return null 

    const sortedTimes = [...times].sort((a, b) => a - b)
    const trimmedTimes = sortedTimes.slice(removeCount, sortedTimes.length - removeCount)

    const sum = trimmedTimes.reduce((acc, time) => acc + time, 0)
    return sum / trimmedTimes.length
}

const calculateMean = (times: number[]): number | null => {
    if (times.length === 0) return null
    const sum = times.reduce((acc, time) => acc + time, 0)
    return sum / times.length
}

export function useAverages(solves: ComputedRef<Solve[]>) {
        const solveTimes = computed(() => solves.value.map(s => s.time))
    const chronologicalTimes = computed(() => [...solveTimes.value].reverse())

    const currentTime = computed(() => {
        return solveTimes.value[0] ?? null
    })

    const bestTime = computed(() => {
        if (solveTimes.value.length === 0) return null
        return Math.min(...solveTimes.value)
    })

    const mo3 = computed(() => {
        if (solveTimes.value.length < 3) return null
        const last3 = solveTimes.value.slice(0, 3)
        return calculateMean(last3)
    })

    const ao5 = computed(() => {
        if (solveTimes.value.length < 5) return null
        const last5 = solveTimes.value.slice(0, 5)
        return calculateAverage(last5, 1)
    })

    const ao12 = computed(() => {
        if (solveTimes.value.length < 12) return null
        const last12 = solveTimes.value.slice(0, 12)
        return calculateAverage(last12, 1)
    })

    const ao100 = computed(() => {
        if (solveTimes.value.length < 100) return null
        const last100 = solveTimes.value.slice(0, 100)
        return calculateAverage(last100, 1)
    })

    const bestAverage = (windowSize: number, removeCount: number) => {
        const values = solveTimes.value
        if (values.length < windowSize) return null

        let best: number | null = null
        for (let i = 0; i + windowSize <= values.length; i++) {
            const window = values.slice(i, i + windowSize)
            const avg = removeCount > 0 ? calculateAverage(window, removeCount) : calculateMean(window)
            if (avg !== null && (best === null || avg < best)) {
                best = avg
            }
        }
        return best
    }

    const bestMo3 = computed(() => bestAverage(3, 0))
    const bestAo5 = computed(() => bestAverage(5, 1))
    const bestAo12 = computed(() => bestAverage(12, 1))
    const bestAo100 = computed(() => bestAverage(100, 1))

    const rollingAo5Chrono = computed(() => {
        return chronologicalTimes.value.map((_, index) => {
            if (index < 4) return null
            const last5 = chronologicalTimes.value.slice(Math.max(0, index - 4), index + 1)
            return calculateAverage(last5, 1)
        })
    })

    const rollingAo12Chrono = computed(() => {
        return chronologicalTimes.value.map((_, index) => {
            if (index < 11) return null
            const last12 = chronologicalTimes.value.slice(Math.max(0, index - 11), index + 1)
            return calculateAverage(last12, 1)
        })
    })

    return {
        currentTime: computed(() => currentTime.value ? formatTime(currentTime.value) : '--'),
        bestTime: computed(() => bestTime.value ? formatTime(bestTime.value) : '--'),
        mo3: computed(() => mo3.value ? formatTime(mo3.value) : '--'),
        ao5: computed(() => ao5.value ? formatTime(ao5.value) : '--'),
        ao12: computed(() => ao12.value ? formatTime(ao12.value) : '--'),
        ao100: computed(() => ao100.value ? formatTime(ao100.value) : '--'),
        bestMo3: computed(() => bestMo3.value ? formatTime(bestMo3.value) : '--'),
        bestAo5: computed(() => bestAo5.value ? formatTime(bestAo5.value) : '--'),
        bestAo12: computed(() => bestAo12.value ? formatTime(bestAo12.value) : '--'),
        bestAo100: computed(() => bestAo100.value ? formatTime(bestAo100.value) : '--'),
        rollingAo5Chrono: computed(() => rollingAo5Chrono.value.map(avg => avg ? formatTime(avg) : '--')),
        rollingAo12Chrono: computed(() => rollingAo12Chrono.value.map(avg => avg ? formatTime(avg) : '--'))
    }
}