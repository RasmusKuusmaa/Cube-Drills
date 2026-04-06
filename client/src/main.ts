import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import { useAuthStore } from './stores/auth';

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(router);

  const authStore = useAuthStore();
  if (localStorage.getItem('token')) {
    await authStore.fetchUser();
    if (!authStore.user) {
      router.push('/login');
    }
  }

  app.mount('#app');
}

bootstrap();