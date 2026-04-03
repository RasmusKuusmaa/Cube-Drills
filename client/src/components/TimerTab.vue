<template>
  <div class="timer-container">
    <div class="solves">Solves list</div>

    <div class="main">
      <div class="cube-selection-container">3x3</div>

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
import { GeneratedIdentifierFlags } from 'typescript';
import { ref, onMounted, onUnmounted } from 'vue';
// timer
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

    scramble.value = generateScramble();
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

    if (min === 0) {
      displayTime.value = `${sec
        .toString()
        .padStart(2, '0')}.${Math.floor(ms / 10)
          .toString()
          .padStart(2, '0')}`;
    } else {
      displayTime.value = `${min}:${sec
        .toString()
        .padStart(2, '0')}.${Math.floor(ms / 10)
          .toString()
          .padStart(2, '0')}`;
    }
  }, 10);
};

const stopTimer = () => {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    if (e.repeat) return;

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


// scramble

const scramble = ref("something broke, try restarting the timer to generate a new scramble");
const moves = { "3x3": ['U', 'D', 'L', 'R', 'F', 'B'] };
const modifiers = { "3x3": ['', "'", '2'] };

const generateScramble = (size = "3x3", length = 20) => {
  let res: string[] = [];
  let lastMove = '';
  if (size == "3x3") {
    for (let i = 0; i < length; i++) {
      let move = moves[size][Math.floor(Math.random() * moves[size].length)];

      while (move === lastMove) {
        move = moves[size][Math.floor(Math.random() * moves[size].length)];
      }

      lastMove = move;
      const modifier = modifiers[size][Math.floor(Math.random() * modifiers[size].length)];

      res.push(move + modifier);
    }

    return res.join(' ');
  }
}

onMounted(() => {
  scramble.value = generateScramble();

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