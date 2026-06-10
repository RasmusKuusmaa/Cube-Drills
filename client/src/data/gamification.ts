// Gamification catalog: daily-challenge pool, achievements, and the XP/level
// curve. These are pure, static definitions — the engine in
// `useGamification.ts` feeds activity events through them and persists progress.

export type ActivityType = 'solve' | 'cross' | 'inspection' | 'memo' | 'alg'

// Categories used for daily time tracking and time-based goals. Time logged is
// the sum of recorded solve/execution durations ("active practice time").
export const TIME_CATEGORIES: { id: ActivityType; label: string; icon: string }[] = [
    { id: 'solve', label: 'Solving', icon: '⏱️' },
    { id: 'alg', label: 'Algorithms', icon: '⚡' },
    { id: 'cross', label: 'Cross', icon: '✚' },
    { id: 'inspection', label: 'Inspection', icon: '👀' },
    { id: 'memo', label: 'Memo', icon: '🧠' },
]

// An event emitted whenever the user does something trackable. The engine fills
// in derived flags (isPB, ao12Ms) for main-timer solves before scoring.
export type GameEvent = {
    type: ActivityType
    timeMs?: number
    penalty?: 'OK' | '+2' | 'DNF'
    success?: boolean // memo recall correctness
    cube?: string // puzzle type for solves (e.g. '3x3'), used for per-cube time
    isPB?: boolean
    ao12Ms?: number | null
}

// --- XP & levels ----------------------------------------------------------
// XP required to advance from `level` to `level + 1`.
export const xpForLevel = (level: number): number => 100 + (level - 1) * 50

export type LevelInfo = {
    level: number
    intoLevel: number // XP earned into the current level
    neededForNext: number // XP span of the current level
    progress: number // 0..1 toward the next level
}

export const levelInfo = (totalXp: number): LevelInfo => {
    let level = 1
    let remaining = Math.max(0, totalXp)
    while (remaining >= xpForLevel(level)) {
        remaining -= xpForLevel(level)
        level++
    }
    const neededForNext = xpForLevel(level)
    return { level, intoLevel: remaining, neededForNext, progress: remaining / neededForNext }
}

// Base XP granted for a single activity event.
export const baseXp = (e: GameEvent): number => {
    switch (e.type) {
        case 'solve':
            return e.penalty === 'DNF' ? 1 : 5
        case 'cross':
            return 3
        case 'inspection':
            return e.penalty === 'DNF' ? 1 : 4
        case 'memo':
            return e.success ? 8 : 3
        case 'alg':
            return 2
    }
}

export const PB_XP = 50

// --- Daily challenges -----------------------------------------------------
export type ChallengeTemplate = {
    id: string
    icon: string
    title: string
    desc: string
    target: number
    xp: number
    // How much a given event contributes toward this challenge.
    delta: (e: GameEvent) => number
}

export const DAILY_COUNT = 3

export const DAILY_POOL: ChallengeTemplate[] = [
    {
        id: 'solves-20', icon: '🧩', title: 'Daily Reps', desc: 'Complete 20 solves', target: 20, xp: 40,
        delta: (e) => (e.type === 'solve' && e.penalty !== 'DNF' ? 1 : 0),
    },
    {
        id: 'solves-50', icon: '🔥', title: 'Grind Session', desc: 'Complete 50 solves', target: 50, xp: 80,
        delta: (e) => (e.type === 'solve' && e.penalty !== 'DNF' ? 1 : 0),
    },
    {
        id: 'pb-single', icon: '🏆', title: 'Push the Limit', desc: 'Set a new personal-best single', target: 1, xp: 70,
        delta: (e) => (e.type === 'solve' && e.isPB ? 1 : 0),
    },
    {
        id: 'cross-15', icon: '✚', title: 'Cross Control', desc: 'Drill 15 crosses', target: 15, xp: 40,
        delta: (e) => (e.type === 'cross' ? 1 : 0),
    },
    {
        id: 'inspection-12', icon: '⏱️', title: 'Cool Under Pressure', desc: 'Run 12 inspection drills', target: 12, xp: 40,
        delta: (e) => (e.type === 'inspection' ? 1 : 0),
    },
    {
        id: 'memo-5', icon: '🧠', title: 'Memory Lane', desc: 'Nail 5 memo recalls', target: 5, xp: 60,
        delta: (e) => (e.type === 'memo' && e.success ? 1 : 0),
    },
    {
        id: 'alg-30', icon: '⚡', title: 'Algorithm Drilling', desc: 'Drill 30 algorithm cases', target: 30, xp: 40,
        delta: (e) => (e.type === 'alg' ? 1 : 0),
    },
    {
        id: 'mixed-explore', icon: '🎯', title: 'Well Rounded', desc: 'Complete 25 drills of any kind', target: 25, xp: 50,
        delta: (e) => (e.type === 'cross' || e.type === 'inspection' || e.type === 'memo' || e.type === 'alg' ? 1 : 0),
    },
]

// --- Achievements ---------------------------------------------------------
export type AchievementSnapshot = {
    solves: number
    crossReps: number
    inspectionReps: number
    memoCorrect: number
    algReps: number
    bestSingleMs: number | null
    bestAo12Ms: number | null
    streakLongest: number
}

export type Achievement = {
    id: string
    group: string
    icon: string
    title: string
    desc: string
    target: number
    xp: number
    // Current progress toward `target` derived from lifetime stats.
    progress: (s: AchievementSnapshot) => number
}

const underMs = (value: number | null, threshold: number): number =>
    value !== null && value < threshold ? 1 : 0

export const ACHIEVEMENTS: Achievement[] = [
    // Volume
    { id: 'solves-100', group: 'Volume', icon: '💯', title: 'Centurion', desc: 'Complete 100 solves', target: 100, xp: 60, progress: (s) => s.solves },
    { id: 'solves-1000', group: 'Volume', icon: '🧊', title: 'Cube Veteran', desc: 'Complete 1,000 solves', target: 1000, xp: 200, progress: (s) => s.solves },
    { id: 'solves-5000', group: 'Volume', icon: '🏔️', title: 'Cube Marathon', desc: 'Complete 5,000 solves', target: 5000, xp: 500, progress: (s) => s.solves },

    // Consistency / streaks
    { id: 'streak-3', group: 'Consistency', icon: '🌱', title: 'Getting Going', desc: 'Reach a 3-day streak', target: 3, xp: 50, progress: (s) => s.streakLongest },
    { id: 'streak-7', group: 'Consistency', icon: '📅', title: 'Week Warrior', desc: 'Reach a 7-day streak', target: 7, xp: 120, progress: (s) => s.streakLongest },
    { id: 'streak-30', group: 'Consistency', icon: '🗓️', title: 'Unbreakable', desc: 'Reach a 30-day streak', target: 30, xp: 400, progress: (s) => s.streakLongest },

    // Single milestones
    { id: 'sub-30', group: 'Speed', icon: '🚶', title: 'Sub-30', desc: 'Get a single under 30s', target: 1, xp: 60, progress: (s) => underMs(s.bestSingleMs, 30000) },
    { id: 'sub-20', group: 'Speed', icon: '🏃', title: 'Sub-20', desc: 'Get a single under 20s', target: 1, xp: 120, progress: (s) => underMs(s.bestSingleMs, 20000) },
    { id: 'sub-15', group: 'Speed', icon: '⚡', title: 'Sub-15', desc: 'Get a single under 15s', target: 1, xp: 200, progress: (s) => underMs(s.bestSingleMs, 15000) },
    { id: 'sub-10', group: 'Speed', icon: '🚀', title: 'Sub-10', desc: 'Get a single under 10s', target: 1, xp: 400, progress: (s) => underMs(s.bestSingleMs, 10000) },

    // Average milestones
    { id: 'ao12-sub-30', group: 'Averages', icon: '📉', title: 'Steady Sub-30', desc: 'Get an ao12 under 30s', target: 1, xp: 80, progress: (s) => underMs(s.bestAo12Ms, 30000) },
    { id: 'ao12-sub-20', group: 'Averages', icon: '📊', title: 'Steady Sub-20', desc: 'Get an ao12 under 20s', target: 1, xp: 160, progress: (s) => underMs(s.bestAo12Ms, 20000) },
    { id: 'ao12-sub-15', group: 'Averages', icon: '🎖️', title: 'Steady Sub-15', desc: 'Get an ao12 under 15s', target: 1, xp: 280, progress: (s) => underMs(s.bestAo12Ms, 15000) },

    // Training
    { id: 'cross-100', group: 'Training', icon: '✚', title: 'Cross Trainer', desc: 'Drill 100 crosses', target: 100, xp: 60, progress: (s) => s.crossReps },
    { id: 'cross-500', group: 'Training', icon: '➕', title: 'Cross Master', desc: 'Drill 500 crosses', target: 500, xp: 180, progress: (s) => s.crossReps },
    { id: 'memo-25', group: 'Training', icon: '🧠', title: 'Memory Spark', desc: 'Nail 25 memo recalls', target: 25, xp: 60, progress: (s) => s.memoCorrect },
    { id: 'memo-100', group: 'Training', icon: '🧩', title: 'Blind Ambition', desc: 'Nail 100 memo recalls', target: 100, xp: 180, progress: (s) => s.memoCorrect },
    { id: 'alg-250', group: 'Training', icon: '⚙️', title: 'Algorithm Apprentice', desc: 'Drill 250 algorithm cases', target: 250, xp: 80, progress: (s) => s.algReps },
    { id: 'alg-1000', group: 'Training', icon: '🛠️', title: 'Algorithm Adept', desc: 'Drill 1,000 algorithm cases', target: 1000, xp: 220, progress: (s) => s.algReps },
]
