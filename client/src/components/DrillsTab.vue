<template>
  <div>
    <h1>3Bld memo trainer</h1>

    <h2 v-if="authStore.user">
      Welcome, {{ authStore.user.name }}
    </h2>

    <button @click="logout">Logout</button>

    <div>
      <label>Number of letters:</label>
      <input type="number" v-model.number="seqLength" min="1" />
      <button @click="generateSequence">Generate</button>

      <div v-if="sequence && res === null">
        <div v-if="!seqHidden">
          <p>{{ sequence }}</p>
          <button @click="seqHidden = true">Hide Sequence</button>
        </div>

        <div v-else>
          <p>Input the sequence</p>
          <input v-model="userInput" />
          <button @click="checkSequence">Check</button>
        </div>
      </div>

      <p v-if="res === true">Correct</p>
      <p v-else-if="res !== null">
        False <br />
        Entered: {{ userInput }} <br />
        Correct: {{ sequence }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const seqLength = ref<number>(20);
const sequence = ref<string>('');
const userInput = ref<string>('');
const res = ref<boolean | null>(null);
const seqHidden = ref<boolean>(false);

const logout = () => {
  authStore.logout();
  router.push('/login');
};

onMounted(() => {
  authStore.fetchUser();
});

function generateSequence() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let seq = '';

  for (let i = 0; i < seqLength.value; i++) {
    seq += letters[Math.floor(Math.random() * letters.length)];
  }

  sequence.value = seq;
  res.value = null;
  userInput.value = '';
}

function checkSequence() {
  res.value =
    userInput.value.toUpperCase() === sequence.value.toUpperCase();
  seqHidden.value = false;
}
</script>