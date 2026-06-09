// Helpers for working with WCA move notation (used to build setup scrambles
// from algorithms). A setup scramble is simply the inverse of an algorithm:
// applying the inverse to a solved cube creates the case, and executing the
// algorithm then returns the cube to solved.

const normalize = (alg: string): string[] =>
    alg
        .replace(/[()]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)

// Invert a single move: X -> X', X' -> X, X2 stays X2. The base (letter plus an
// optional wide `w`, e.g. Rw / r / M / x) is preserved.
const invertMove = (move: string): string => {
    if (move.endsWith('2')) return move
    if (move.endsWith("'")) return move.slice(0, -1)
    return move + "'"
}

export const invertScramble = (alg: string): string =>
    normalize(alg).reverse().map(invertMove).join(' ')

export const moveCount = (alg: string): number => normalize(alg).length

const AUF_MOVES = ['', 'U', 'U2', "U'"]

// A random U-face turn, used to vary the recognition angle of a case.
export const randomAuf = (): string =>
    AUF_MOVES[Math.floor(Math.random() * AUF_MOVES.length)] ?? ''
