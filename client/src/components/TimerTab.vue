<template>
  <div class="timer-container">
    <div class="solves">
      <div v-for="solve in solves" :key="solve.id">
        {{ solve.time / 1000 }}
      </div>
    </div>
    <div class="main">
      <div class="cube-selection-container">
        <select v-model="selectedCube" @change="updateCube(selectedCube)">
          <option v-for="cube in cubes" :key="cube" :value="cube">{{ cube }}</option>
        </select>
      </div>

      <div class="scramble-container">{{ scramble }}</div>

      <div class="timer-area">
        <div class="timer" :class="timerClass">{{ displayTime }}</div>
        <div class="averages">
          <span>ao5: 10.25</span>
          <span>ao12: 11.14</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useTimer } from '../composables/useTimer'
import { useScramble } from '../composables/useScramble'
import { useSolves } from '@/composables/usesolves'



const cubes = ['2x2', '3x3', '4x4', '5x5', 'Megaminx', 'Pyraminx', 'Skewb', 'Square-1', 'Clock']
const storedCube = localStorage.getItem('selectedCube') ?? '3x3'


const { solves, addSolve } = useSolves();
const { displayTime, timerClass, startTimer, startHold, releaseHold } = useTimer(
  {
    onFinish: (finalTime) => {
      addSolve({
        time: finalTime,
        scramble: scramble.value,
        cube: selectedCube.value,
        penalty: "OK"
      })

      generateScramble(selectedCube.value);
    }
  }
)
const { scramble, selectedCube, updateCube, generateScramble } = useScramble(storedCube)

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault()
    startHold(
      () => { }
    )
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    e.preventDefault()
    releaseHold(() => startTimer())
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
}) 
</script>

<style scoped>
.timer-container {
  display: grid;
  grid-template-columns: 10rem 1fr;
  height: 100%;
}

.solves {
  border-right: 2px solid black;
  padding: 10px;
}

.main {
  display: grid;
  grid-template-rows: 50px 50px 1fr;
  padding: 10px;
}

.cube-selection-container,
.scramble-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.timer-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120px;
}

.timer {
  font-size: 64px;
  user-select: none;
}

.timer.ready {
  color: green;
}

.timer.early {
  color: red;
}

.timer.running {
  color: black;
}
</style>