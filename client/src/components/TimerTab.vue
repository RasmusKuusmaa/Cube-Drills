<template>
  <div class="timer-container">
    <div class="solves">
      Solves list
    </div>

    <div class="main">
      <div class="cube-selection-container">
        3x3  
      </div>
      <div class="scrable-container"> 
        l' f' b2 u2 d rf u2 ' f' b2 u2 d rf u2  f' b2 u2 d rf u2 
      </div>

      <div class="timer-area">
        <div class="timer">00:00.00</div>
        <div class="avarages">
          <span>ao5: 10.25</span>
          <span>ao12: 11.14</span>
          </div>  
        </div>
      </div>  
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>

.timer-container {
  display: grid;
  grid-template-columns: 10rem 1fr;
  height: 100vh;
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
.cube-selection-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.scrable-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timer-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 120px;
}

.timer {
  font-size: 32px;
}

.avarages {
  display: flex;
  flex-direction: column;
  padding: 4px;
  gap: 2px;
  font-size: 18px;
}


</style>
