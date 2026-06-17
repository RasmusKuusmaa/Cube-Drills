import { computed, ref, type Ref } from 'vue'
import type { Penalty } from '@/utils/solves'

// WCA-style 15-second inspection: +2 after 15s, DNF after 17s, with judge
// "8 seconds" / "12 seconds" audio cues. Mirrors the InspectionTrainer drill
// so the main timer can offer the same behaviour as a toggle.
export function useInspection(options?: { sound?: Ref<boolean> }) {
    const inspectionMs = ref(0)
    const isInspecting = ref(false)
    let startTs = 0
    let interval: number | null = null
    const cuesPlayed = new Set<number>()
    let audioCtx: AudioContext | null = null

    const beep = (freq: number) => {
        if (options?.sound && !options.sound.value) return
        try {
            audioCtx ??= new (window.AudioContext || (window as any).webkitAudioContext)()
            const osc = audioCtx.createOscillator()
            const gain = audioCtx.createGain()
            osc.frequency.value = freq
            osc.connect(gain)
            gain.connect(audioCtx.destination)
            gain.gain.setValueAtTime(0.001, audioCtx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01)
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18)
            osc.start()
            osc.stop(audioCtx.currentTime + 0.2)
        } catch {
            /* audio unavailable */
        }
    }

    const penaltyFor = (ms: number): Penalty => {
        if (ms > 17000) return 'DNF'
        if (ms > 15000) return '+2'
        return 'OK'
    }

    const display = computed(() => Math.max(0, (15000 - inspectionMs.value) / 1000).toFixed(1))
    const livePenalty = computed<Penalty | ''>(() => {
        const p = penaltyFor(inspectionMs.value)
        return p === 'OK' ? '' : p
    })
    // Tiered cue for colour-coding the countdown (go -> warn1 -> warn2 -> over).
    const tier = computed(() => {
        if (inspectionMs.value > 15000) return 'over'
        if (inspectionMs.value > 12000) return 'warn2'
        if (inspectionMs.value > 8000) return 'warn1'
        return 'go'
    })

    const clear = () => {
        isInspecting.value = false
        if (interval) {
            clearInterval(interval)
            interval = null
        }
    }

    const start = () => {
        isInspecting.value = true
        inspectionMs.value = 0
        startTs = performance.now()
        cuesPlayed.clear()
        interval = window.setInterval(() => {
            inspectionMs.value = performance.now() - startTs
            for (const cue of [8000, 12000]) {
                if (inspectionMs.value >= cue && !cuesPlayed.has(cue)) {
                    cuesPlayed.add(cue)
                    beep(cue === 8000 ? 660 : 880)
                }
            }
        }, 50)
    }

    // Ends inspection and reports how long it ran plus the resulting penalty.
    const stop = (): { elapsed: number; penalty: Penalty } => {
        const elapsed = isInspecting.value ? performance.now() - startTs : 0
        clear()
        return { elapsed, penalty: penaltyFor(elapsed) }
    }

    const reset = () => {
        clear()
        inspectionMs.value = 0
    }

    return { isInspecting, inspectionMs, display, livePenalty, tier, start, stop, reset, penaltyFor }
}
