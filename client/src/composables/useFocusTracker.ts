import { onMounted, onUnmounted } from 'vue'
import { addFocus } from '@/composables/useGamification'

// Accrues "focused" wall-clock time while the user is actively practicing:
// the tab must be visible and there must have been user interaction within the
// idle window. Mounted once (in the Dashboard) so it spans every tab.

const TICK_MS = 5000 // how often to bank elapsed time
const IDLE_MS = 60000 // no interaction for this long ⇒ considered away

const ACTIVITY_EVENTS = ['keydown', 'pointerdown', 'mousemove', 'wheel', 'touchstart'] as const

export function useFocusTracker() {
    let lastActivity = Date.now()
    let lastTick = Date.now()
    let interval: number | null = null

    const markActive = () => {
        lastActivity = Date.now()
    }

    const onTick = () => {
        const now = Date.now()
        const elapsed = now - lastTick
        lastTick = now
        const idle = now - lastActivity > IDLE_MS
        // Guard against huge jumps (sleep/throttled tab) by capping at one window.
        if (!document.hidden && !idle && elapsed <= TICK_MS * 2) {
            addFocus(elapsed)
        }
    }

    const onVisibility = () => {
        // Don't count time spent with the tab hidden; resume cleanly on return.
        lastTick = Date.now()
        if (!document.hidden) lastActivity = Date.now()
    }

    onMounted(() => {
        for (const e of ACTIVITY_EVENTS) window.addEventListener(e, markActive, { passive: true })
        document.addEventListener('visibilitychange', onVisibility)
        lastTick = Date.now()
        lastActivity = Date.now()
        interval = window.setInterval(onTick, TICK_MS)
    })

    onUnmounted(() => {
        for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, markActive)
        document.removeEventListener('visibilitychange', onVisibility)
        if (interval) clearInterval(interval)
    })
}
