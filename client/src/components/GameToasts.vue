<template>
  <div class="toast-stack">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="t.kind"
        @click="dismissToast(t.id)"
      >
        <span class="toast-icon">{{ t.icon }}</span>
        <span class="toast-body">
          <span class="toast-title">{{ t.title }}</span>
          <span class="toast-sub">{{ t.sub }}</span>
        </span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useGamification } from '@/composables/useGamification'

const { toasts, dismissToast } = useGamification()
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 240px;
  max-width: 320px;
  padding: 12px 14px;
  background: white;
  border: 1px solid #e5e7eb;
  border-left: 4px solid #2563eb;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
  cursor: pointer;
}

.toast.level { border-left-color: #8b5cf6; }
.toast.pb { border-left-color: #f59e0b; }
.toast.daily { border-left-color: #2563eb; }
.toast.achievement { border-left-color: #16a34a; }
.toast.streak { border-left-color: #ef4444; }

.toast-icon {
  font-size: 1.6rem;
  line-height: 1;
  flex-shrink: 0;
}

.toast-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toast-title {
  font-weight: 700;
  font-size: 0.92rem;
  color: #1f2937;
}

.toast-sub {
  font-size: 0.78rem;
  color: #6b7280;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
