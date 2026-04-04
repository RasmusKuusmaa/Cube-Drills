import { addSyntheticLeadingComment } from 'typescript';
import { ref, watch } from 'vue';

export type Solve = {
    id: string;
    time: number;
    scramble: string;
    cube: string;
    date: string;
    penalty?: 'OK' | '+2' | 'DNF';
}

const STORAGE_KEY = 'solves';

const solves = ref<Solve[]>([]);

const loadSolves = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    solves.value = raw ? JSON.parse(raw) : [];
}

watch(
    solves,
    (newVal) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal))
    },
    { deep: true }
)

const generateId = () => crypto.randomUUID();

export function useSolves() {
    if (solves.value.length === 0) {
        loadSolves();
    }

    const addSolve = (data: Omit<Solve, 'id' | 'date'>) => {
        const solve: Solve = {
            id: generateId(),
            date: new Date().toISOString(),
            ...data
        }

        solves.value.unshift(solve);
    }

    const deleteSolve = (id: string) => {
        solves.value = solves.value.filter(s => s.id !== id);
    }

    const clearSolves = () => {
        solves.value = [];
    }

    return {
        solves,
        addSolve,
        deleteSolve,
        clearSolves
    }
}