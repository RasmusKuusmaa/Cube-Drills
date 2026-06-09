// A small 3x3 facelet cube simulator, used to generate PLL recognition
// diagrams. Given an algorithm, we apply its inverse (the setup) to a solved
// cube, normalize the orientation, and read off the last-layer sticker colors
// and the piece permutation (arrows). The move directions in this file are
// validated against the standard cube (U moves Front -> Left, every PLL setup
// disturbs only the top layer, and round-trips return to solved).

export type Vec = [number, number, number]
export type FaceId = 'U' | 'D' | 'F' | 'B' | 'R' | 'L'

type Sticker = { pos: Vec; nrm: Vec; color: FaceId; origin: Vec; oface: FaceId }

const eq = (a: Vec, b: Vec) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]

const cross = (a: Vec, b: Vec): Vec => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
]

// Rotate a vector 90° about an axis (0=X,1=Y,2=Z); dir=+1 is right-handed.
const rot = (v: Vec, axis: number, dir: number): Vec => {
    const [x, y, z] = v
    if (axis === 0) return [x, -dir * z, dir * y]
    if (axis === 1) return [dir * z, y, -dir * x]
    return [-dir * y, dir * x, z]
}

const FACES: { id: FaceId; nrm: Vec }[] = [
    { id: 'U', nrm: [0, 1, 0] },
    { id: 'D', nrm: [0, -1, 0] },
    { id: 'F', nrm: [0, 0, 1] },
    { id: 'B', nrm: [0, 0, -1] },
    { id: 'R', nrm: [1, 0, 0] },
    { id: 'L', nrm: [-1, 0, 0] },
]

export const solvedCube = (): Sticker[] => {
    const st: Sticker[] = []
    for (const f of FACES) {
        for (let a = -1; a <= 1; a++) {
            for (let b = -1; b <= 1; b++) {
                let pos: Vec
                if (f.nrm[0] !== 0) pos = [f.nrm[0], a, b]
                else if (f.nrm[1] !== 0) pos = [a, f.nrm[1], b]
                else pos = [a, b, f.nrm[2]]
                st.push({ pos, nrm: [...f.nrm], color: f.id, origin: [...pos], oface: f.id })
            }
        }
    }
    return st
}

type MoveDef = { axis: number; layers: number[]; s: number }

const BASE: Record<string, MoveDef> = {
    U: { axis: 1, layers: [1], s: -1 },
    D: { axis: 1, layers: [-1], s: 1 },
    R: { axis: 0, layers: [1], s: -1 },
    L: { axis: 0, layers: [-1], s: 1 },
    F: { axis: 2, layers: [1], s: -1 },
    B: { axis: 2, layers: [-1], s: 1 },
    M: { axis: 0, layers: [0], s: 1 },
    E: { axis: 1, layers: [0], s: 1 },
    S: { axis: 2, layers: [0], s: -1 },
    x: { axis: 0, layers: [-1, 0, 1], s: -1 },
    y: { axis: 1, layers: [-1, 0, 1], s: -1 },
    z: { axis: 2, layers: [-1, 0, 1], s: -1 },
    Rw: { axis: 0, layers: [1, 0], s: -1 },
    Lw: { axis: 0, layers: [-1, 0], s: 1 },
    Uw: { axis: 1, layers: [1, 0], s: -1 },
    Dw: { axis: 1, layers: [-1, 0], s: 1 },
    Fw: { axis: 2, layers: [1, 0], s: -1 },
    Bw: { axis: 2, layers: [-1, 0], s: 1 },
}

const applyDef = (st: Sticker[], def: MoveDef, s: number) => {
    for (const k of st) {
        if (def.layers.includes(k.pos[def.axis]!)) {
            k.pos = rot(k.pos, def.axis, s)
            k.nrm = rot(k.nrm, def.axis, s)
        }
    }
}

const parseToken = (t: string) => {
    const prime = t.includes("'")
    const dbl = t.includes('2')
    const body = t.replace(/['2]/g, '')
    let base = body
    if (/^[xyz]$/.test(body)) base = body
    else if (body.length === 2 && body[1] === 'w') base = body
    else if (/^[udfbrl]$/.test(body)) base = body.toUpperCase() + 'w'
    return { base, prime, dbl }
}

const applyMove = (st: Sticker[], token: string) => {
    const { base, prime, dbl } = parseToken(token)
    const def = BASE[base]
    if (!def) return
    const s = prime ? -def.s : def.s
    const times = dbl ? 2 : 1
    for (let i = 0; i < times; i++) applyDef(st, def, s)
}

export const applyAlg = (st: Sticker[], alg: string) => {
    for (const t of alg.replace(/[()]/g, ' ').trim().split(/\s+/).filter(Boolean)) {
        applyMove(st, t)
    }
}

const invert = (alg: string): string =>
    alg
        .replace(/[()]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .reverse()
        .map((m) => (m.endsWith('2') ? m : m.endsWith("'") ? m.slice(0, -1) : m + "'"))
        .join(' ')

const find = (st: Sticker[], pos: Vec, nrm: Vec) => st.find((k) => eq(k.pos, pos) && eq(k.nrm, nrm))
const findCenter = (st: Sticker[], color: FaceId) =>
    st.find((k) => k.color === color && k.origin.filter((c) => c === 0).length === 2)!

// Re-orient the cube so the U-color center is up and the F-color center is
// front, cancelling any whole-cube rotation left by the algorithm.
const normalize = (st: Sticker[]) => {
    const u = findCenter(st, 'U').nrm
    const f = findCenter(st, 'F').nrm
    const rx = cross(u, f)
    const Rm: Vec[] = [rx, u, f]
    const ap = (v: Vec): Vec => [
        Rm[0]![0] * v[0] + Rm[0]![1] * v[1] + Rm[0]![2] * v[2],
        Rm[1]![0] * v[0] + Rm[1]![1] * v[1] + Rm[1]![2] * v[2],
        Rm[2]![0] * v[0] + Rm[2]![1] * v[1] + Rm[2]![2] * v[2],
    ]
    for (const k of st) {
        k.pos = ap(k.pos)
        k.nrm = ap(k.nrm)
    }
}

export type SlotId = 'UFR' | 'UFL' | 'UBL' | 'UBR' | 'UF' | 'UR' | 'UB' | 'UL'

const SLOTS: { id: SlotId; pos: Vec }[] = [
    { id: 'UFR', pos: [1, 1, 1] },
    { id: 'UFL', pos: [-1, 1, 1] },
    { id: 'UBL', pos: [-1, 1, -1] },
    { id: 'UBR', pos: [1, 1, -1] },
    { id: 'UF', pos: [0, 1, 1] },
    { id: 'UR', pos: [1, 1, 0] },
    { id: 'UB', pos: [0, 1, -1] },
    { id: 'UL', pos: [-1, 1, 0] },
]

export type PllDiagram = {
    // 9 U-face colors in top-view row-major order: row 0 = back, row 2 = front;
    // col 0 = left, col 2 = right.
    u: FaceId[]
    // Each side's top row (the stickers adjacent to U).
    front: FaceId[] // left -> right (x = -1..1)
    back: FaceId[] // left -> right (x = -1..1)
    left: FaceId[] // back -> front (z = -1..1)
    right: FaceId[] // back -> front (z = -1..1)
    // Where each displaced piece needs to go to solve the case.
    arrows: { from: SlotId; to: SlotId }[]
}

export const colorAt = (st: Sticker[], pos: Vec, nrm: Vec): FaceId => find(st, pos, nrm)?.color ?? 'U'

// Build the last-layer recognition diagram for a PLL algorithm.
export const buildPllDiagram = (alg: string): PllDiagram => {
    const st = solvedCube()
    applyAlg(st, invert(alg))
    normalize(st)

    const u: FaceId[] = []
    for (let z = -1; z <= 1; z++) {
        for (let x = -1; x <= 1; x++) {
            u.push(colorAt(st, [x, 1, z], [0, 1, 0]))
        }
    }

    const front: FaceId[] = [-1, 0, 1].map((x) => colorAt(st, [x, 1, 1], [0, 0, 1]))
    const back: FaceId[] = [-1, 0, 1].map((x) => colorAt(st, [x, 1, -1], [0, 0, -1]))
    const left: FaceId[] = [-1, 0, 1].map((z) => colorAt(st, [-1, 1, z], [-1, 0, 0]))
    const right: FaceId[] = [-1, 0, 1].map((z) => colorAt(st, [1, 1, z], [1, 0, 0]))

    const arrows: { from: SlotId; to: SlotId }[] = []
    for (const slot of SLOTS) {
        const sticker = find(st, slot.pos, [0, 1, 0])
        if (!sticker) continue
        const home = SLOTS.find((s) => eq(s.pos, sticker.origin))
        if (home && home.id !== slot.id) arrows.push({ from: slot.id, to: home.id })
    }

    return { u, front, back, left, right, arrows }
}
