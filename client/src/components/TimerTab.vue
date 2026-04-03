<template>
  <div class="timer-container">
    <div class="solves">Solves list</div>

    <div class="main">
      <div class="cube-selection-container">
        <select v-model="selectedCube">
          <option value="2x2">2x2</option>
          <option value="3x3">3x3</option>
          <option value="4x4">4x4</option>
          <option value="5x5">5x5</option>
          <option value="Megaminx">Megaminx</option>
          <option value="Pyraminx">Pyraminx</option>
          <option value="Skewb">Skewb</option>
          <option value="Square-1">Square-1</option>
          <option value="Clock">Clock</option>
        </select>
      </div>

      <div class="scrable-container">
        {{ scramble }}
      </div>

      <div class="timer-area">
        <div class="timer" :class="timerClass">
          {{ displayTime }}
        </div>

        <div class="avarages">
          <span>ao5: 10.25</span>
          <span>ao12: 11.14</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';

//timer
const timer = ref(0);
let interval: number | null = null;
const holding = ref(false);
let holdTimeout: number | null = null;
const isReady = ref(false);
const isRunning = ref(false);
const displayTime = ref('00:00');
const timerClass = ref('');
const previousTime = ref('0.00');

const startHold = () => {
  if (holding.value) return;
  if (isRunning.value) {
    stopTimer();
    isRunning.value = false;
    previousTime.value = displayTime.value;
    timerClass.value = '';
    scramble.value = generateScramble(selectedCube.value);
    return;
  }
  holding.value = true;
  timerClass.value = 'early';
  holdTimeout = window.setTimeout(() => {
    if (holding.value) {
      isReady.value = true;
      timerClass.value = 'ready';
    }
  }, 500);
};

const releaseHold = () => {
  if (!holding.value) return;
  if (holdTimeout) {
    clearTimeout(holdTimeout);
    holdTimeout = null;
  }
  if (isReady.value) {
    startTimer();
    isRunning.value = true;
  } else {
    timerClass.value = 'early';
  }
  holding.value = false;
  isReady.value = false;
};

const startTimer = () => {
  timer.value = 0;
  timerClass.value = 'running';
  interval = window.setInterval(() => {
    timer.value += 10;
    const ms = timer.value % 1000;
    const totalSec = Math.floor(timer.value / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    displayTime.value = min === 0
      ? `${sec.toString().padStart(2,'0')}.${Math.floor(ms/10).toString().padStart(2,'0')}`
      : `${min}:${sec.toString().padStart(2,'0')}.${Math.floor(ms/10).toString().padStart(2,'0')}`;
  }, 10);
};

const stopTimer = () => {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    startHold();
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    e.preventDefault();
    releaseHold();
  }
};

//scramble
interface CubeType {
  moves: string[];
  modifiers: string[];
  scrambleLength: number;
}

let storedCube = localStorage.getItem('selectedCube');
if (!storedCube || !['2x2','3x3','4x4','5x5','Megaminx','Pyraminx','Skewb','Square-1','Clock'].includes(storedCube)) {
  storedCube = '3x3';
}

const selectedCube = ref(storedCube);

const cubeConfigs: Record<string, CubeType> = {
  "2x2": { moves: ['U','D','L','R','F','B'], modifiers: ["","'","2"], scrambleLength: 11 },
  "3x3": { moves: ['U','D','L','R','F','B'], modifiers: ["","'","2"], scrambleLength: 20 },
  "4x4": { moves: ['U','D','L','R','F','B','Uw','Dw','Lw','Rw','Fw','Bw'], modifiers: ["","'","2"], scrambleLength: 40 },
  "5x5": { moves: ['U','D','L','R','F','B','Uw','Dw','Lw','Rw','Fw','Bw'], modifiers: ["","'","2"], scrambleLength: 60 },
  "Megaminx": { moves: ['R','D','U','L','B'], modifiers: ["","'"], scrambleLength: 70 },
  "Pyraminx": { moves: ['U','L','R','B'], modifiers: ["","'","2"], scrambleLength: 11 },
  "Skewb": { moves: ['R','L','U','B'], modifiers: ["","'"], scrambleLength: 11 },
  "Square-1": { moves: ['(1,0)','(0,1)','(1,1)','(-1,0)','(0,-1)'], modifiers: [], scrambleLength: 14 },
  "Clock": { moves: ['UR','UL','DR','DL','U','D','L','R'], modifiers: ['0','1','2','3','4','5'], scrambleLength: 9 },
};

const generateScramble = (cube = "3x3") => {
  const config = cubeConfigs[cube];
  if (!config) return "unknown cube type";
  const { moves, modifiers, scrambleLength } = config;
  let res: string[] = [];
  let lastMove: string | null = null;
  for (let i = 0; i < scrambleLength; i++) {
    let move = moves[Math.floor(Math.random() * moves.length)];
    while (lastMove && move[0] === lastMove[0]) {
      move = moves[Math.floor(Math.random() * moves.length)];
    }
    lastMove = move;
    const mod = modifiers.length > 0 ? modifiers[Math.floor(Math.random() * modifiers.length)] : '';
    res.push(move + mod);
  }
  return res.join(' ');
};

const scramble = ref(generateScramble(selectedCube.value));

const updateCube = (cube: string) => {
  localStorage.setItem('selectedCube', cube);
  scramble.value = generateScramble(cube);
};

watch(selectedCube, (newCube, oldCube) => {
  if (newCube !== oldCube) updateCube(newCube);
});

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
});
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
.scrable-container {
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