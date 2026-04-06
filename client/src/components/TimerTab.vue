<template>
  <div class="timer-container">
    <div class="solves">
      <div class="custom-select">
        <div class="selected" @click="dropdownOpen = !dropdownOpen">
          {{ sessions.find(s => s.id === currentSessionId)?.name || 'Select Session' }}
        </div>
        <div v-if="dropdownOpen" class="options">
          <div v-for="session in sessions" :key="session.id" class="option" @click="selectSession(session.id)">
            <span>{{ session.name }}</span>
            <button @click.stop="editSession(session)">Edit</button>
          </div>
        </div>
      </div>
      <button @click="handleNewSession">+ New Session</button>

      <div v-for="solve in solves" :key="solve.id">
        {{ (solve.time / 1000).toFixed(2) }}
      </div>
    </div>

    <NewSessionModal
      v-if="!editingSession"
      :show="showModal"
      @confirm="handleConfirm"
      @close="closeModal"
    />

    <EditSessionModal
      v-if="editingSession"
      :show="showModal"
      :initial-name="editingSession?.name || ''"
      @confirm="handleConfirm"
      @delete="handleDeleteModal"
      @close="closeModal"
    />

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
          <span>ao5: 10.25</span>
          <span>ao12: 11.14</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useTimer } from '../composables/useTimer'
import { useScramble } from '../composables/useScramble'
import { useSessions } from '@/composables/useSessions'
import NewSessionModal from './NewSessionModal.vue'
import EditSessionModal from './EditSessionModal.vue'

type Session = {
  id: string
  name: string
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
  display: grid;
  grid-template-columns: 10rem 1fr;
  height: 100%;
}

.solves {
  border-right: 2px solid black;
  padding: 10px;
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