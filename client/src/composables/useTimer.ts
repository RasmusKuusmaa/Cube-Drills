import { ref } from 'vue'

export function useTimer() {
    const timer = ref(0)
    const displayTime = ref('00:00')
    const isRunning = ref(false)
    const isReady = ref(false)
    const holding = ref(false)
    const timerClass = ref('')
    let interval: number | null = null
    let holdTimeout: number | null = null

    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000)
        const seconds = Math.floor((ms % 60000) / 1000)
        const centiseconds = Math.floor((ms % 1000) / 10)
        return minutes
            ? `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
            : `${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
    }

    const startTimer = () => {
        if (isRunning.value) return
        timer.value = 0
        timerClass.value = 'running'
        interval = window.setInterval(() => {
            timer.value += 10
            displayTime.value = formatTime(timer.value)
        }, 10)
        isRunning.value = true
    }

    const stopTimer = () => {
        if (interval) {
            clearInterval(interval)
            interval = null
        }
        isRunning.value = false
        timerClass.value = ''
    }

    const startHold = (onReady: () => void, onStop?: () => void) => {
        if (holding.value) return

        if (isRunning.value) {
            stopTimer()
            if (onStop) onStop()
            holding.value = false
            isReady.value = false
            return
        }

        holding.value = true
        timerClass.value = 'early'
        holdTimeout = window.setTimeout(() => {
            if (holding.value) {
                isReady.value = true
                timerClass.value = 'ready'
                onReady()
            }
        }, 500)
    }

    const releaseHold = (onStart: () => void) => {
        if (!holding.value) return
        if (holdTimeout) clearTimeout(holdTimeout)
        if (isReady.value) onStart()
        timerClass.value = isReady.value ? 'running' : 'early'
        holding.value = false
        isReady.value = false
    }

    return {
        timer,
        displayTime,
        isRunning,
        timerClass,
        startTimer,
        stopTimer,
        startHold,
        releaseHold
    }
}