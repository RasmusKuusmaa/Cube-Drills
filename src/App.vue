
<template>
  <div>
    <h1>3Bld memo trainer</h1>
    <div>
      <label for="length">Number of letters:</label>
      <input id="length" type="number" v-model.number="seqLength" min="1" />
      <button @click="generateSequence">Generate</button>

      <div v-if="sequence">
        <p>{{ sequence }}</p>
      </div>
    </div>
  </div>

</template>

<script setup lang="ts">
  import {ref} from "vue";

  const seqLength = ref<number>(20);
  const sequence =  ref<string>("");
  
  function generateSequence(): void {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    let seq = "";
    
    for (let i = 0;i < seqLength.value;i++){
      seq += letters[Math.floor(Math.random() * letters.length)]
    }

    sequence.value =  seq;
  }
  

  
</script>

<style scoped></style>
