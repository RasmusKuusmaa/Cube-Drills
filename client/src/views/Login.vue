<template>
  <div>
    <h1>Login</h1>

    <form @submit.prevent="submit">
      <input v-model="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Password" />
      <button>Login</button>
    </form>

    <p>
      No account? <router-link to="/register">Register</router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const authStore = useAuthStore();
const router = useRouter();

const submit = async () => {
  try {
    await authStore.login({
      email: email.value,
      password: password.value,
    });

    await authStore.fetchUser();
    router.push('/dashboard');
  } catch (err: any) {
    alert(err.response?.data?.error || 'Login failed');
  }
};
</script>