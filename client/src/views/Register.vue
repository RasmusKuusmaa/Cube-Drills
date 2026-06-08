<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1>Create your account</h1>
        <p class="auth-subtitle">Start tracking your solves with Cube Drills</p>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <label class="field">
          <span class="field-label">Name</span>
          <input v-model="name" type="text" placeholder="Your name" autocomplete="name" />
        </label>

        <label class="field">
          <span class="field-label">Email</span>
          <input v-model="email" type="email" placeholder="you@example.com" autocomplete="email" />
        </label>

        <label class="field">
          <span class="field-label">Password</span>
          <input v-model="password" type="password" placeholder="••••••••" autocomplete="new-password" />
        </label>

        <label class="field">
          <span class="field-label">Confirm password</span>
          <input v-model="password_confirmation" type="password" placeholder="••••••••" autocomplete="new-password" />
        </label>

        <button class="submit-btn" type="submit">Register</button>
      </form>

      <p class="auth-footer">
        Already have an account? <router-link to="/login">Login</router-link>
      </p>
    </div>
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

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 36px 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

.auth-header {
  text-align: center;
  margin-bottom: 28px;
}

.auth-header h1 {
  font-size: 1.7rem;
  font-weight: 600;
  color: var(--color-heading);
  line-height: 1.2;
}

.auth-subtitle {
  margin-top: 6px;
  color: var(--color-text);
  opacity: 0.7;
  font-size: 0.9rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-heading);
}

.field input {
  width: 100%;
  padding: 11px 13px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field input:focus {
  outline: none;
  border-color: hsla(160, 100%, 37%, 1);
  box-shadow: 0 0 0 3px hsla(160, 100%, 37%, 0.15);
}

.submit-btn {
  margin-top: 6px;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: hsla(160, 100%, 37%, 1);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn:hover {
  background: hsla(160, 100%, 30%, 1);
}

.auth-footer {
  margin-top: 22px;
  text-align: center;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.85;
}

.auth-footer a {
  color: hsla(160, 100%, 37%, 1);
  font-weight: 500;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>
