<template>
  <div>
    <h1>Register</h1>

    <form @submit.prevent="submit">
      <input v-model="name" placeholder="Name" />
      <input v-model="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Password" />
      <input v-model="password_confirmation" type="password" placeholder="Confirm Password" />
      <button>Register</button>
    </form>

    <p>
      Already have an account? <router-link to="/login">Login</router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const name = ref('');
const email = ref('');
const password = ref('');
const password_confirmation = ref('');

const authStore = useAuthStore();
const router = useRouter();

const submit = async () => {
  try {
    await authStore.register({
      name: name.value,
      email: email.value,
      password: password.value,
      password_confirmation: password_confirmation.value,
    });
    await authStore.fetchUser();
    router.push('/dashboard');
  } catch (err: any) {
    alert(JSON.stringify(err?.response?.data || err.message));
  
}
};
</script>