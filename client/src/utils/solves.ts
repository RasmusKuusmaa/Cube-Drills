export type Penalty = 'OK' | '+2' | 'DNF'

export interface SolveLike {
    time: number
    penalty?: Penalty | null
}

const PLUS_TWO_MS = 2000


export const effectiveTime = (solve: SolveLike): number => {
    if (solve.penalty === 'DNF') return Infinity
    if (solve.penalty === '+2') return solve.time + PLUS_TWO_MS
    return solve.time
}

export const formatMs = (ms: number | null): string => {
    if (ms === null) return '--'
    if (!Number.isFinite(ms)) return 'DNF'
    return (ms / 1000).toFixed(2)
}

export const formatSolve = (solve: SolveLike): string => {
    if (solve.penalty === 'DNF') return 'DNF'
    const base = (solve.time / 1000).toFixed(2)
    return solve.penalty === '+2' ? `${base} +2` : base
}

// Human-readable duration for long spans, e.g. 1h 23m 45s or 12m 03s.
export const formatDuration = (ms: number | null): string => {
    if (ms === null || !Number.isFinite(ms)) return '--'
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
        return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
    }
    if (minutes > 0) {
        return `${minutes}m ${String(seconds).padStart(2, '0')}s`
    }
    return `${seconds}s`
}
