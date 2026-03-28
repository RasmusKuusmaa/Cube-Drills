import { defineStore } from 'pinia';
import { useAuth } from '../composables/useAuth';

export const useAuthStore = defineStore('auth', () => {
  const { user, login, register, logout, fetchUser } = useAuth();

  return { user, login, register, logout, fetchUser };
});