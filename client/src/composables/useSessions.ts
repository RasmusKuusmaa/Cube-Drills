import { ref, computed, watch } from 'vue'

type Solve = {
    id: string
    time: number
    scramble: string
    date: string
    penalty?: 'OK' | '+2' | 'DNF'
}

type Session = {
    id: string
    name: string
    createdAt: string
    cube: string | null
    solves: Solve[]
}

const STORAGE_KEY = 'sessions'

const sessions = ref<Session[]>([])
const currentSessionId = ref<string | null>(null)

let initialized = false

const load = () => {
    const raw = localStorage.getItem(STORAGE_KEY)
    sessions.value = raw ? JSON.parse(raw) : []

    const savedId = localStorage.getItem('currentSessionId')
    currentSessionId.value = savedId || sessions.value[0]?.id || null
}

watch(
    sessions,
    (val) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    },
    { deep: true }
)

watch(currentSessionId, (id) => {
    if (id) {
        localStorage.setItem('currentSessionId', id)
    }
})

const generateId = () => crypto.randomUUID()

export function useSessions() {
    if (!initialized) {
        load()
        initialized = true
    }

    const currentSession = computed(() => {
        return sessions.value.find(s => s.id === currentSessionId.value) || null
    })

    const solves = computed(() => currentSession.value?.solves || [])

    const createSession = (name: string, cube: string | null = null) => {
        const session: Session = {
            id: generateId(),
            name,
            cube,
            createdAt: new Date().toISOString(),
            solves: []
        }

        sessions.value.unshift(session)
        currentSessionId.value = session.id
    }

    const switchSession = (id: string) => {
        currentSessionId.value = id
    }

    const addSolve = (solveData: Omit<Solve, 'id' | 'date'>) => {
        if (!currentSession.value) return

        const solve: Solve = {
            id: generateId(),
            date: new Date().toISOString(),
            ...solveData
        }

        currentSession.value.solves.unshift(solve)
    }

    const deleteSolve = (id: string) => {
        if (!currentSession.value) return

        currentSession.value.solves =
            currentSession.value.solves.filter(s => s.id !== id)
    }

    return {
        sessions,
        currentSession,
        currentSessionId,
        solves,
        createSession,
        switchSession,
        addSolve,
        deleteSolve
    }
}