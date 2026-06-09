// Algorithm sets for the trainer. The trainer is self-consistent for any valid
// notation: the setup scramble is the inverse of `alg`, so executing `alg`
// always solves the generated case. New sets (OLL, F2L, ...) can be added here
// without touching the trainer logic.

export type AlgSet = 'PLL' | 'OLL' | 'F2L'

export type Algorithm = {
    id: string
    set: AlgSet
    name: string
    // Sub-category within the set, used for grouping in the browser.
    group: string
    alg: string
    // Part of the beginner "2-look" subset.
    twoLook?: boolean
}

// Full PLL set (21 cases) using standard, widely-taught algorithms.
export const algorithms: Algorithm[] = [
    // --- Edge permutations (corners solved) ---
    { id: 'pll-ua', set: 'PLL', name: 'Ua Perm', group: 'Edges', twoLook: true, alg: "M2 U M U2 M' U M2" },
    { id: 'pll-ub', set: 'PLL', name: 'Ub Perm', group: 'Edges', twoLook: true, alg: "M2 U' M U2 M' U' M2" },
    { id: 'pll-z', set: 'PLL', name: 'Z Perm', group: 'Edges', twoLook: true, alg: "M2 U M2 U M' U2 M2 U2 M'" },
    { id: 'pll-h', set: 'PLL', name: 'H Perm', group: 'Edges', twoLook: true, alg: "M2 U M2 U2 M2 U M2" },

    // --- Corner permutations (edges solved) ---
    { id: 'pll-aa', set: 'PLL', name: 'Aa Perm', group: 'Corners', twoLook: true, alg: "x R' U R' D2 R U' R' D2 R2 x'" },
    { id: 'pll-ab', set: 'PLL', name: 'Ab Perm', group: 'Corners', twoLook: true, alg: "x R2 D2 R U R' D2 R U' R x'" },
    { id: 'pll-e', set: 'PLL', name: 'E Perm', group: 'Corners', twoLook: true, alg: "x' L' U L D' L' U' L D L' U' L D' L' U L D x" },

    // --- Adjacent corner swap ---
    { id: 'pll-t', set: 'PLL', name: 'T Perm', group: 'Adjacent swap', alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
    { id: 'pll-ja', set: 'PLL', name: 'Ja Perm', group: 'Adjacent swap', alg: "R' U L' U2 R U' R' U2 R L" },
    { id: 'pll-jb', set: 'PLL', name: 'Jb Perm', group: 'Adjacent swap', alg: "R U R' F' R U R' U' R' F R2 U' R' U'" },
    { id: 'pll-ra', set: 'PLL', name: 'Ra Perm', group: 'Adjacent swap', alg: "R U' R' U' R U R D R' U' R D' R' U2 R' U'" },
    { id: 'pll-rb', set: 'PLL', name: 'Rb Perm', group: 'Adjacent swap', alg: "R' U2 R U2 R' F R U R' U' R' F' R2 U'" },
    { id: 'pll-f', set: 'PLL', name: 'F Perm', group: 'Adjacent swap', alg: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
    { id: 'pll-ga', set: 'PLL', name: 'Ga Perm', group: 'Adjacent swap', alg: "R2 U R' U R' U' R U' R2 U' D R' U R D'" },
    { id: 'pll-gb', set: 'PLL', name: 'Gb Perm', group: 'Adjacent swap', alg: "R' U' R U D' R2 U R' U R U' R U' R2 D" },
    { id: 'pll-gc', set: 'PLL', name: 'Gc Perm', group: 'Adjacent swap', alg: "R2 U' R U' R U R' U R2 U D' R U' R' D" },
    { id: 'pll-gd', set: 'PLL', name: 'Gd Perm', group: 'Adjacent swap', alg: "R U R' U' D R2 U' R U' R' U R' U R2 D'" },

    // --- Diagonal corner swap ---
    { id: 'pll-v', set: 'PLL', name: 'V Perm', group: 'Diagonal swap', alg: "R' U R' U' y R' F' R2 U' R' U R' F R F" },
    { id: 'pll-y', set: 'PLL', name: 'Y Perm', group: 'Diagonal swap', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
    { id: 'pll-na', set: 'PLL', name: 'Na Perm', group: 'Diagonal swap', alg: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'" },
    { id: 'pll-nb', set: 'PLL', name: 'Nb Perm', group: 'Diagonal swap', alg: "R' U R U' R' F' U' F R U R' F R' F' R U' R" },
]

export const ALG_SETS: AlgSet[] = ['PLL']

export const algorithmsBySet = (set: AlgSet): Algorithm[] =>
    algorithms.filter((a) => a.set === set)
