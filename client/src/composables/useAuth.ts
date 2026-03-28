import { ref } from 'vue';
import api from '../api/api';
import type { LoginPayload, RegisterPayload, AuthResponse, User } from '../types/auth';

const user = ref<User | null>(null);

export function useAuth() {
const login = async (payload: LoginPayload) => {
  const { data } = await api.post<AuthResponse>('login', payload);
    localStorage.setItem('token', data.token);
    user.value = data.user ?? null;
  };

  const register = async (payload: RegisterPayload) => {
    console.log('PAYLOAD:', payload);

    const response = await api.post('register', payload);
    localStorage.setItem('token', response.data.token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    user.value = null;
  };

  const fetchUser = async () => {
    try {
      const { data } = await api.get<User>('me');
      user.value = data;
    } catch {
      logout();
    }
  };

  return { user, login, register, logout, fetchUser };
}