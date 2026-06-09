// Optimal solver for the white (D) cross on a 3x3.
//
// It works on a reduced cube state: only the four D-layer cross edges
// (DF, DR, DB, DL) matter, each described by which of the 12 edge slots it
// occupies and its orientation. The edge-move tables are *derived* from the
// validated facelet model in `cube.ts` (rather than hand-coded), so the move
// semantics are guaranteed to match a real cube.
//
// A breadth-first search from the solved cross builds a pattern database giving
// the exact distance-to-solved for every reachable cross state. Solving a
// scramble is then a gradient walk down that table, which yields a move-optimal
// (fewest HTM moves) cross solution.

import { solvedCube, applyAlg, colorAt, type FaceId, type Vec } from './cube'

// The 12 edge slots. `P` is the slot's primary face normal, `S` the secondary.
// For U/D slots the primary is the U/D face; for E-slots it is the F/B face.
// Cross edges are DF, DR, DB, DL at indices 4..7.
type Slot = { id: string; pos: Vec; P: Vec; S: Vec }
const SLOTS: Slot[] = [
    { id: 'UF', pos: [0, 1, 1], P: [0, 1, 0], S: [0, 0, 1] },
    { id: 'UR', pos: [1, 1, 0], P: [0, 1, 0], S: [1, 0, 0] },
    { id: 'UB', pos: [0, 1, -1], P: [0, 1, 0], S: [0, 0, -1] },
    { id: 'UL', pos: [-1, 1, 0], P: [0, 1, 0], S: [-1, 0, 0] },
    { id: 'DF', pos: [0, -1, 1], P: [0, -1, 0], S: [0, 0, 1] },
    { id: 'DR', pos: [1, -1, 0], P: [0, -1, 0], S: [1, 0, 0] },
    { id: 'DB', pos: [0, -1, -1], P: [0, -1, 0], S: [0, 0, -1] },
    { id: 'DL', pos: [-1, -1, 0], P: [0, -1, 0], S: [-1, 0, 0] },
    { id: 'FR', pos: [1, 0, 1], P: [0, 0, 1], S: [1, 0, 0] },
    { id: 'FL', pos: [-1, 0, 1], P: [0, 0, 1], S: [-1, 0, 0] },
    { id: 'BR', pos: [1, 0, -1], P: [0, 0, -1], S: [1, 0, 0] },
    { id: 'BL', pos: [-1, 0, -1], P: [0, 0, -1], S: [-1, 0, 0] },
]

const CROSS_IDS = [4, 5, 6, 7] // DF, DR, DB, DL

const faceOf = (n: Vec): FaceId => {
    if (n[1] === 1) return 'U'
    if (n[1] === -1) return 'D'
    if (n[2] === 1) return 'F'
    if (n[2] === -1) return 'B'
    if (n[0] === 1) return 'R'
    return 'L'
}

// Map an unordered color pair to the slot whose solved stickers are those colors.
const pairKey = (a: FaceId, b: FaceId) => [a, b].sort().join('')
const PAIR_TO_SLOT: Record<string, number> = {}
SLOTS.forEach((s, i) => {
    PAIR_TO_SLOT[pairKey(faceOf(s.P), faceOf(s.S))] = i
})

// The 18 half-turn-metric moves.
export const MOVES = [
    'U', "U'", 'U2', 'D', "D'", 'D2', 'L', "L'", 'L2',
    'R', "R'", 'R2', 'F', "F'", 'F2', 'B', "B'", 'B2',
] as const
export type Move = (typeof MOVES)[number]

// For each move: `to[a]` = slot a piece in slot `a` moves to; `flip[a]` = the
// orientation flip (0/1) it picks up making that move. Derived by applying the
// move to a solved facelet cube and reading where each edge landed.
type MoveTable = { to: number[]; flip: number[] }

const deriveMoveTable = (move: string): MoveTable => {
    const st = solvedCube()
    applyAlg(st, move)
    const to = new Array(12).fill(0)
    const flip = new Array(12).fill(0)
    for (let s = 0; s < 12; s++) {
        const slot = SLOTS[s]!
        const cP = colorAt(st, slot.pos, slot.P)
        const cS = colorAt(st, slot.pos, slot.S)
        const home = PAIR_TO_SLOT[pairKey(cP, cS)]! // which piece now sits in slot s
        // Primary-face color the piece has when oriented (its home primary color).
        const oriented = faceOf(SLOTS[home]!.P)
        to[home] = s
        flip[home] = cP === oriented ? 0 : 1
    }
    return { to, flip }
}

const MOVE_TABLES: MoveTable[] = MOVES.map(deriveMoveTable)

// --- Reduced cross state: 4 pieces, each (slot 0..11, ori 0..1) -------------
// Encoded little-endian in base 24 (slot*2+ori per piece).
const encode = (slots: number[], oris: number[]): number => {
    let code = 0
    for (let i = 3; i >= 0; i--) code = code * 24 + (slots[i]! * 2 + oris[i]!)
    return code
}

const SOLVED_CODE = encode([4, 5, 6, 7], [0, 0, 0, 0])
const TABLE_SIZE = 24 * 24 * 24 * 24

// Apply a move to a reduced state given as parallel slot/ori arrays (mutates copies).
const stepReduced = (slots: number[], oris: number[], m: MoveTable) => {
    const ns = new Array(4)
    const no = new Array(4)
    for (let i = 0; i < 4; i++) {
        const a = slots[i]!
        ns[i] = m.to[a]!
        no[i] = oris[i]! ^ m.flip[a]!
    }
    return { slots: ns, oris: no }
}

// Pattern database: distance-to-solved for every reachable cross state.
let DIST: Int8Array | null = null

const buildDistTable = (): Int8Array => {
    const dist = new Int8Array(TABLE_SIZE).fill(-1)
    dist[SOLVED_CODE] = 0
    // BFS frontier stored as decoded states to avoid re-decoding.
    let frontier: { code: number; slots: number[]; oris: number[] }[] = [
        { code: SOLVED_CODE, slots: [4, 5, 6, 7], oris: [0, 0, 0, 0] },
    ]
    let depth = 0
    while (frontier.length) {
        const next: typeof frontier = []
        for (const node of frontier) {
            for (const m of MOVE_TABLES) {
                const r = stepReduced(node.slots, node.oris, m)
                const code = encode(r.slots, r.oris)
                if (dist[code] === -1) {
                    dist[code] = depth + 1
                    next.push({ code, slots: r.slots, oris: r.oris })
                }
            }
        }
        frontier = next
        depth++
    }
    return dist
}

const distTable = (): Int8Array => (DIST ??= buildDistTable())

// Track the full 12-edge permutation/orientation while applying a scramble.
const applyScrambleToEdges = (scramble: string) => {
    const slotOf = Array.from({ length: 12 }, (_, i) => i) // piece p -> current slot
    const oriOf = new Array(12).fill(0)
    for (const token of scramble.trim().split(/\s+/).filter(Boolean)) {
        const idx = MOVES.indexOf(token as Move)
        if (idx === -1) continue // ignore rotations / non-face moves
        const m = MOVE_TABLES[idx]!
        for (let p = 0; p < 12; p++) {
            const a = slotOf[p]!
            slotOf[p] = m.to[a]!
            oriOf[p] = oriOf[p]! ^ m.flip[a]!
        }
    }
    return { slotOf, oriOf }
}

export type CrossSolution = {
    moves: Move[]
    length: number
}

// Optimal white-cross solution for a scramble (assumes white on bottom, the
// standard fixed orientation used by `useScramble`). Returns [] if already solved.
export const solveCross = (scramble: string): CrossSolution => {
    const dist = distTable()
    const { slotOf, oriOf } = applyScrambleToEdges(scramble)

    let slots = CROSS_IDS.map((id) => slotOf[id]!)
    let oris = CROSS_IDS.map((id) => oriOf[id]!)

    const moves: Move[] = []
    let guard = 0
    while (encode(slots, oris) !== SOLVED_CODE && guard < 20) {
        const here = dist[encode(slots, oris)]!
        let advanced = false
        for (let i = 0; i < MOVE_TABLES.length; i++) {
            const r = stepReduced(slots, oris, MOVE_TABLES[i]!)
            if (dist[encode(r.slots, r.oris)] === here - 1) {
                moves.push(MOVES[i]!)
                slots = r.slots
                oris = r.oris
                advanced = true
                break
            }
        }
        if (!advanced) break
        guard++
    }
    return { moves, length: moves.length }
}
