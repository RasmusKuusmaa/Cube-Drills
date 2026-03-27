<template>
  <div>
    <h1>3Bld memo trainer</h1>
    <div>
      <label for="length">Number of letters:</label>
      <input id="length" type="number" v-model.number="seqLength" min="1" />
      <button @click="generateSequence">Generate</button>

      <div v-if="sequence && res === null">
        <div v-if="!seqHidden">


          <p>{{ sequence }}</p>


          <button @click="seqHidden = true">Hide Sequence</button>
        </div>
        <div v-if="seqHidden">
          <P> Input the sequence</P>
          <input type="text" v-model="userInput" placeholder="Enter the sequence" :disabled="res !== null" />
          <button @click="checkSequence">Check</button>
        </div>
      </div>

      <p v-if="res === true">Correct</p>
      <p v-else-if="res !== null">False
        <br>
        Entered: {{ userInput }}
        <br>
        Correct: {{ sequence }}
      </p>
    </div>
  </div>

</template>

<script setup lang="ts">
import { ref } from "vue";

const seqLength = ref<number>(20);
const sequence = ref<string>("");
const userInput = ref<string>("");
const res = ref<boolean | null>(null);
const seqHidden = ref<boolean>(false);

function generateSequence(): void {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let seq = "";

  for (let i = 0; i < seqLength.value; i++) {
    seq += letters[Math.floor(Math.random() * letters.length)]
  }

  sequence.value = seq;
  res.value = null;
  userInput.value = "";
}

function checkSequence(): void {
  res.value = userInput.value.toUpperCase() === sequence.value.toUpperCase();
  seqHidden.value = false;
}



</script>

<style scoped></style>
