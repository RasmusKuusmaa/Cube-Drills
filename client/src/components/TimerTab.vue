<template>
  <div class="timer-container">
    <div class="solves">
      <div class="custom-select">
        <div class="selected" @click="dropdownOpen = !dropdownOpen">
          {{sessions.find(s => s.id === currentSessionId)?.name || 'Select Session'}}
        </div>
        <div v-if="dropdownOpen" class="options">
          <div v-for="session in sessions" :key="session.id" class="option" @click="selectSession(session.id)">
            <span>{{ session.name }}</span>
            <button @click.stop="editSession(session)">Edit</button>
          </div>
        </div>
      </div>
      <button @click="handleNewSession">+ New Session</button>

      <div class="stats-box">
        <div class="stat-card">
          <div class="stat-card-title">Current</div>
          <div class="stat-item"><span>Time</span><span>{{ currentTime }}</span></div>
          <div class="stat-item"><span>mo3</span><span>{{ mo3 }}</span></div>
          <div class="stat-item"><span>ao5</span><span>{{ ao5 }}</span></div>
          <div class="stat-item"><span>ao12</span><span>{{ ao12 }}</span></div>
          <div class="stat-item"><span>ao100</span><span>{{ ao100 }}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">Best</div>
          <div class="stat-item"><span>Time</span><span>{{ bestTime }}</span></div>
          <div class="stat-item"><span>mo3</span><span>{{ bestMo3 }}</span></div>
          <div class="stat-item"><span>ao5</span><span>{{ bestAo5 }}</span></div>
          <div class="stat-item"><span>ao12</span><span>{{ bestAo12 }}</span></div>
          <div class="stat-item"><span>ao100</span><span>{{ bestAo100 }}</span></div>
        </div>
      </div>

      <div class="solves-list">
        <div class="solve-item solve-header">
          <span class="solve-number">#</span>
          <span class="solve-time">Time</span>
          <span class="solve-ao5">ao5</span>
          <span class="solve-ao12">ao12</span>
        </div>
        <div v-for="(solve, index) in solves" :key="solve.id" class="solve-item" @click="openSolveModal(solve)">
          <span class="solve-number"> {{ solves.length - index }}.</span>
          <span class="solve-time">{{ (solve.time / 1000).toFixed(2) }}</span>
          <span class="solve-ao5">{{ reversedAo5[index] }}</span>
          <span class="solve-ao12">{{ reversedAo12[index] }}</span>
        </div>
      </div>
    </div>

    <NewSessionModal v-if="!editingSession" :show="showModal" @confirm="handleConfirm" @close="closeModal" />

    <EditSessionModal v-if="editingSession" :show="showModal" :initial-name="editingSession?.name || ''"
      @confirm="handleConfirm" @delete="handleDeleteModal" @close="closeModal" />

    <SolveModal :show="showSolveModal" :solve="selectedSolve" @close="closeSolveModal" />

    <div class="main">
      <div class="cube-selection-container">
        <select v-model="selectedCube" @change="updateCube(selectedCube)">
          <option v-for="cube in cubes" :key="cube" :value="cube">
            {{ cube }}
          </option>
        </select>
      </div>

      <div class="scramble-container">{{ scramble }}</div>

      <div class="timer-area">
        <div class="timer" :class="timerClass">{{ displayTime }}</div>
        <div class="averages">
          <span>ao5: {{ ao5 }}</span>
          <span>ao12: {{ ao12 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useTimer } from '../composables/useTimer'
import { useScramble } from '../composables/useScramble'
import { useSessions } from '@/composables/useSessions'
import { useAverages } from '@/composables/useAverages'
import NewSessionModal from './NewSessionModal.vue'
import EditSessionModal from './EditSessionModal.vue'
import SolveModal from './SolveModal.vue'

type Session = {
  id: string
  name: string
}

type Solve = {
  id: string
  time: number
  scramble: string
  date: string
  penalty?: 'OK' | '+2' | 'DNF'
}

const cubes = ['2x2', '3x3', '4x4', '5x5', 'Megaminx', 'Pyraminx', 'Skewb', 'Square-1', 'Clock']
const storedCube = localStorage.getItem('selectedCube') ?? '3x3'

const {
  sessions,
  currentSessionId,
  solves,
  addSolve,
  createSession,
  updateSession,
  deleteSession
} = useSessions()


const { scramble, selectedCube, updateCube, generateScramble } = useScramble(storedCube)

const { displayTime, timerClass, startTimer, startHold, releaseHold } = useTimer({
  onFinish: (finalTime) => {
    addSolve({
      time: finalTime,
      scramble: scramble.value,
      penalty: 'OK'
    })

    generateScramble(selectedCube.value)
  }
})

const {
  currentTime,
  bestTime,
  mo3,
  ao5,
  ao12,
  ao100,
  bestMo3,
  bestAo5,
  bestAo12,
  bestAo100,
  rollingAo5Chrono,
  rollingAo12Chrono
} = useAverages(solves)

const reversedAo5 = computed(() => [...rollingAo5Chrono.value].reverse())
const reversedAo12 = computed(() => [...rollingAo12Chrono.value].reverse())

const showModal = ref(false)
const editingSession = ref<Session | null>(null)
const dropdownOpen = ref(false)

const selectSession = (id: string) => {
  currentSessionId.value = id
  dropdownOpen.value = false
}

const editSession = (session: Session) => {
  editingSession.value = session
  showModal.value = true
}

const handleDeleteModal = async () => {
  if (editingSession.value && confirm(`Delete session "${editingSession.value.name}"? This will also delete all solves in this session.`)) {
    await deleteSession(editingSession.value.id)
    showModal.value = false
    editingSession.value = null
  }
}

const handleConfirm = async (name: string) => {
  if (name) {
    if (editingSession.value) {
      await updateSession(editingSession.value.id, name)
    } else {
      await createSession(name)
    }
    showModal.value = false
    editingSession.value = null
  }
}

const closeModal = () => {
  showModal.value = false
}

const handleNewSession = () => {
  editingSession.value = null
  showModal.value = true
}

const selectedSolve = ref<Solve | null>(null);
const showSolveModal = ref(false);

const openSolveModal = (solve: Solve) => {
  selectedSolve.value = solve;
  showSolveModal.value = true;
}

const closeSolveModal = () => {
  selectedSolve.value = null;
  showSolveModal.value = false;
}



const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault()
    startHold(() => { })
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
  position: fixed;
  display: grid;
  grid-template-columns: 20rem 1fr;
  overflow: hidden;
  width: 100vw;
  height: 100vh;
}

.solves {
  border-right: 2px solid black;
  padding: 10px;
  display: flex;
  flex-direction: column;
  height: 75vh;
  min-height: 0;
  overflow: hidden;
}

.custom-select {
  position: relative;
  margin-bottom: 10px;
}

.selected {
  padding: 8px;
  border: 1px solid #ccc;
  cursor: pointer;
  background: white;
  position: relative;
}

.selected::after {
  content: '▼';
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.options {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  border: 1px solid #ccc;
  background: white;
  z-index: 10;
}

.option {
  padding: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.option:hover {
  background: #f0f0f0;
}

.option button {
  margin-left: 5px;
  padding: 2px 5px;
  font-size: 12px;
}

.stats-box {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.stat-card {
  background: #f9fafb;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 12px;
}

.stat-card-title {
  font-weight: 700;
  margin-bottom: 10px;
  font-size: 0.95rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.stat-item span {
  font-size: 0.9rem;
}

.stat-item span:last-child {
  font-family: monospace;
}

.solves-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.solve-item {
  display: grid;
  grid-template-columns: 30px 80px 60px 60px;
  gap: 8px;
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
  align-items: center;
  font-family: monospace;
  font-size: 14px;
  cursor: pointer;
}

.solve-item.solve-header {
  background: #e8e8e8;
  font-weight: bold;
}

.solve-item:nth-child(even):not(.solve-header) {
  background: #f9f9f9;
}

.solve-number {
  text-align: right;
  color: #666;
}

.solve-time {
  text-align: right;
  font-weight: bold;
}

.solve-ao5,
.solve-ao12 {
  text-align: right;
  color: #888;
  font-size: 12px;
}

.main {
  display: grid;
  grid-template-rows: 50px 50px 1fr;
  padding: 10px;
  min-height: 0;
  overflow: hidden;
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