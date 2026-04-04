import { ref } from 'vue'

interface CubeConfig {
    moves: string[]
    modifiers: string[]
    length: number
}

const cubeConfigs: Record<string, CubeConfig> = {
    '2x2': { moves: ['U', 'D', 'L', 'R', 'F', 'B'], modifiers: ["", "'", "2"], length: 11 },
    '3x3': { moves: ['U', 'D', 'L', 'R', 'F', 'B'], modifiers: ["", "'", "2"], length: 20 },
    '4x4': { moves: ['U', 'D', 'L', 'R', 'F', 'B', 'Uw', 'Dw', 'Lw', 'Rw', 'Fw', 'Bw'], modifiers: ["", "'", "2"], length: 40 },
    '5x5': { moves: ['U', 'D', 'L', 'R', 'F', 'B', 'Uw', 'Dw', 'Lw', 'Rw', 'Fw', 'Bw'], modifiers: ["", "'", "2"], length: 60 },
    'Megaminx': { moves: ['R', 'D', 'U', 'L', 'B'], modifiers: ["", "'"], length: 70 },
    'Pyraminx': { moves: ['U', 'L', 'R', 'B'], modifiers: ["", "'", "2"], length: 11 },
    'Skewb': { moves: ['R', 'L', 'U', 'B'], modifiers: ["", "'"], length: 11 },
    'Square-1': { moves: ['(1,0)', '(0,1)', '(1,1)', '(-1,0)', '(0,-1)'], modifiers: [], length: 14 },
    'Clock': { moves: ['UR', 'UL', 'DR', 'DL', 'U', 'D', 'L', 'R'], modifiers: ['0', '1', '2', '3', '4', '5'], length: 9 }
}

export function useScramble(initialCube: string) {
    const scramble = ref('')
    const selectedCube = ref(initialCube)

    const generateScramble = (cube: string) => {
        const config = cubeConfigs[cube]
        if (!config) return 'unknown cube type'

        const { moves, modifiers, length } = config
        const result: string[] = []
        let lastMove: string | null = null
        
        for (let i = 0; i < length; i++) {
            let move: string
            let attempts = 0
            do {
                move = moves[Math.floor(Math.random() * moves.length)] || ''
                attempts++
                if (attempts > 20) break
            } while (lastMove && cube !== 'Square-1' && move[0] === lastMove[0])

            lastMove = move
            const mod = modifiers.length ? (modifiers[Math.floor(Math.random() * modifiers.length)] || '') : ''
            result.push(move + mod)
        }

        scramble.value = result.join(' ')
        return scramble.value
    }

    const updateCube = (cube: string) => {
        selectedCube.value = cube
        localStorage.setItem('selectedCube', cube)
        generateScramble(cube)
    }

    generateScramble(selectedCube.value)

    return { scramble, selectedCube, updateCube, generateScramble }
}