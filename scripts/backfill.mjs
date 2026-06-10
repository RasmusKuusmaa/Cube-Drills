#!/usr/bin/env node
/*
 * Gamification backfill script.
 *
 * Pulls your full solve history from the API and computes the lifetime totals,
 * best single / best ao12, and per-day solving time that the gamification system
 * tracks. The gamification profile itself lives in the browser's localStorage,
 * so this script can't write it directly — instead it:
 *   1. prints a summary report,
 *   2. writes scripts/backfill.json (the computed data), and
 *   3. writes scripts/backfill.console.js — a one-line command you can paste
 *      into the app's browser console to apply the backfill.
 *
 * The simplest path is to skip this script entirely and just run
 *   cubeBackfill()
 * in the app's browser console (it fetches and applies in one step). This
 * script is for keeping a CLI/export record or backfilling headlessly.
 *
 * Usage:
 *   node scripts/backfill.mjs --email you@example.com --password secret
 *   node scripts/backfill.mjs --token <JWT>
 *   node scripts/backfill.mjs --url http://localhost:8000/api --email ... --password ...
 *
 * Env fallbacks: API_URL, BACKFILL_EMAIL, BACKFILL_PASSWORD, BACKFILL_TOKEN
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

// --- args -----------------------------------------------------------------
const args = {}
for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i]
    if (a.startsWith('--')) {
        const key = a.slice(2)
        const next = process.argv[i + 1]
        if (next && !next.startsWith('--')) {
            args[key] = next
            i++
        } else {
            args[key] = true
        }
    }
}

const apiUrl = (args.url || process.env.API_URL || 'http://localhost:8000/api').replace(/\/$/, '')
const email = args.email || process.env.BACKFILL_EMAIL
const password = args.password || process.env.BACKFILL_PASSWORD
let token = args.token || process.env.BACKFILL_TOKEN

// --- helpers (mirror the app's gamification math) -------------------------
const dayKey = (date) => {
    const d = new Date(date)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}
const effective = (s) => (s.penalty === '+2' ? s.time + 2000 : s.time)
const ao12 = (recent) => {
    if (recent.length < 12) return null
    const sorted = [...recent.slice(0, 12)].sort((a, b) => a - b)
    const middle = sorted.slice(1, sorted.length - 1)
    return middle.reduce((a, t) => a + t, 0) / middle.length
}
const fmtMs = (ms) => (ms == null ? '—' : (ms / 1000).toFixed(2) + 's')
const fmtDur = (ms) => {
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (h) return `${h}h ${String(m).padStart(2, '0')}m`
    if (m) return `${m}m ${String(s % 60).padStart(2, '0')}s`
    return `${s}s`
}

const fail = (msg) => {
    console.error(`\n✖ ${msg}\n`)
    process.exit(1)
}

// --- fetch ----------------------------------------------------------------
const login = async () => {
    const res = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    })
    if (!res.ok) fail(`Login failed (${res.status}). Check your email/password and that the server is running.`)
    const data = await res.json()
    if (!data.token) fail('Login response did not include a token.')
    return data.token
}

const fetchSolves = async () => {
    const res = await fetch(`${apiUrl}/sessions`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (!res.ok) fail(`Fetching sessions failed (${res.status}).`)
    const sessions = await res.json()
    // Attribute each solve to its session's puzzle (may be null for old sessions).
    return sessions.flatMap((s) => (s.solves ?? []).map((solve) => ({ ...solve, cube: s.cube ?? null })))
}

// --- main -----------------------------------------------------------------
const run = async () => {
    if (!token) {
        if (!email || !password) {
            fail('Provide --token, or --email and --password (or set the env vars). See the header for usage.')
        }
        console.log(`→ Logging in to ${apiUrl} as ${email}…`)
        token = await login()
    }

    console.log('→ Fetching solve history…')
    const solves = await fetchSolves()
    if (solves.length === 0) fail('No solves found for this account.')

    const sorted = solves
        .filter((s) => typeof s.time === 'number')
        .sort((a, b) => new Date(a.date ?? 0) - new Date(b.date ?? 0))

    let count = 0
    let bestSingle = null
    let bestAo12 = null
    const recent = []
    const perDay = {}
    const perCube = {}
    for (const s of sorted) {
        const penalty = s.penalty ?? 'OK'
        if (penalty !== 'DNF') {
            count++
            const eff = effective(s)
            if (bestSingle === null || eff < bestSingle) bestSingle = eff
            recent.unshift(eff)
            if (recent.length > 12) recent.pop()
            const a = ao12(recent)
            if (a !== null && (bestAo12 === null || a < bestAo12)) bestAo12 = a
        }
        if (s.date) perDay[dayKey(s.date)] = (perDay[dayKey(s.date)] ?? 0) + s.time
        const cube = s.cube || 'Unknown'
        perCube[cube] = (perCube[cube] ?? 0) + s.time
    }

    const days = Object.keys(perDay).sort()
    const totalTime = Object.values(perDay).reduce((a, ms) => a + ms, 0)
    const cubesSorted = Object.entries(perCube).sort((a, b) => b[1] - a[1])

    // Report
    console.log('\n──────── Backfill summary ────────')
    console.log(`Solves (non-DNF):  ${count}`)
    console.log(`Best single:       ${fmtMs(bestSingle)}`)
    console.log(`Best ao12:         ${fmtMs(bestAo12)}`)
    console.log(`Active days:       ${days.length}`)
    console.log(`Total solve time:  ${fmtDur(totalTime)}`)
    console.log('\nSolving time by cube:')
    for (const [cube, ms] of cubesSorted) console.log(`  ${cube.padEnd(10)} ${fmtDur(ms)}`)
    console.log('\nRecent active days (solving time):')
    for (const d of days.slice(-14)) console.log(`  ${d}   ${fmtDur(perDay[d])}`)
    console.log('──────────────────────────────────\n')

    // Artifacts
    const reportPath = join(here, 'backfill.json')
    writeFileSync(
        reportPath,
        JSON.stringify(
            { generatedAt: new Date().toISOString(), count, bestSingleMs: bestSingle, bestAo12Ms: bestAo12, activeDays: days.length, totalTimeMs: totalTime, perDay, perCube, solves: sorted },
            null,
            2,
        ),
    )

    const consolePath = join(here, 'backfill.console.js')
    const payload = sorted.map((s) => ({ time: s.time, penalty: s.penalty ?? 'OK', date: s.date, cube: s.cube ?? null }))
    writeFileSync(consolePath, `window.cubeApplyBackfill(${JSON.stringify(payload)})\n`)

    console.log(`Wrote ${reportPath}`)
    console.log(`Wrote ${consolePath}`)
    console.log('\nTo apply, do ONE of:')
    console.log('  • In the app (logged in), open the browser console and run:  cubeBackfill()')
    console.log('  • Or paste the contents of scripts/backfill.console.js into the console.\n')
}

run().catch((err) => fail(err?.message ?? String(err)))
