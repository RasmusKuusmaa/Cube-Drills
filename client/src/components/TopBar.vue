<template>
    <div class="top-bar">
        <h1>Cube drills</h1>
        <div class="user-area" v-if="authStore.user">
            <span class="welcome">{{ authStore.user.name }}</span>
            <button class="logout" @click="logout">Logout</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const logout = () => {
    authStore.logout();
    router.push('/login');
};

onMounted(() => {
    if (!authStore.user) authStore.fetchUser();
});
</script>

<style scoped>
.top-bar {
    background-color: gray;
    color: white;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.user-area {
    display: flex;
    align-items: center;
    gap: 12px;
}

.welcome {
    font-size: 0.95rem;
}

.logout {
    background: white;
    color: #1f2937;
    border: none;
    border-radius: 6px;
    padding: 6px 14px;
    cursor: pointer;
    font-size: 0.85rem;
}

.logout:hover {
    background: #f3f4f6;
}
</style>
