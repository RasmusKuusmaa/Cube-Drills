import { ref, computed, watch } from 'vue'
import api from '@/api/api'

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

const sessions = ref<Session[]>([])
const currentSessionId = ref<string | null>(null)

let initialized = false

const getUniqueSessionName = (baseName: string) => {
    const existingNames = new Set(sessions.value.map(s => s.name))
    if (!existingNames.has(baseName)) {
        return baseName
    }

    let counter = 2
    let candidate = `${baseName} ${counter}`
    while (existingNames.has(candidate)) {
        counter += 1
        candidate = `${baseName} ${counter}`
    }

    return candidate
}

const load = async () => {
    try {
        const response = await api.get('/sessions')
        sessions.value = response.data
    } catch {
        sessions.value = []
    }

    const savedId = localStorage.getItem('currentSessionId')
    currentSessionId.value = savedId || sessions.value[0]?.id || null

    if (sessions.value.length === 0) {
        const defaultName = getUniqueSessionName('Session 1')
        await createSession(defaultName)
    }
}

const createSession = async (name: string, cube: string | null = null) => {
    const uniqueName = getUniqueSessionName(name)
    const response = await api.post('/sessions', { name: uniqueName, cube })
    const session = response.data as Session

    sessions.value.unshift({ ...session, solves: session.solves ?? [] })
    currentSessionId.value = session.id

    return session
}

watch(currentSessionId, (id) => {
    if (id) {
        localStorage.setItem('currentSessionId', id)
    }
})

export function useSessions() {
    if (!initialized) {
        load()
        initialized = true
    }

    const currentSession = computed(() => {
        return sessions.value.find(s => s.id === currentSessionId.value) || null
    })

    const solves = computed(() => currentSession.value?.solves || [])

    const switchSession = (id: string) => {
        currentSessionId.value = id
    }

    const addSolve = async (solveData: Omit<Solve, 'id' | 'date'>) => {
        if (!currentSession.value) return

        const tempSolve: Solve = {
            id: `temp-${crypto.randomUUID()}`,
            date: new Date().toISOString(),
            ...solveData,
        }

        currentSession.value.solves.unshift(tempSolve)

        try {
            const response = await api.post(`/sessions/${currentSession.value.id}/solves`, solveData)
            const savedSolve = response.data as Solve
            const index = currentSession.value.solves.findIndex(s => s.id === tempSolve.id)
            if (index !== -1) {
                currentSession.value.solves[index] = savedSolve
            }
            return savedSolve
        } catch (error) {
            currentSession.value.solves = currentSession.value.solves.filter(s => s.id !== tempSolve.id)
            throw error
        }
    }

    return {
        sessions,
        currentSession,
        currentSessionId,
        solves,
        createSession,
        switchSession,
        addSolve,
    }
}