<template>
  <div class="right-tab-bar">
    <button 
      v-for="tab in tabs" 
      :key="tab.id"
      @click="$emit('switch-tab', tab.id)"
      :class="{ active: currentTab === tab.id }"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">

const props = defineProps<{
  tabs: { id: string; label: string }[];
  currentTab: string;
}>();
</script>

<style scoped>
.right-tab-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #ecf0f1;
  padding: 16px;
  width: 200px;
}

.right-tab-bar button {
  padding: 8px;
  cursor: pointer;
}

.right-tab-bar button.active {
  font-weight: bold;
  background-color: #3498db;
  color: white;
}
</style>