<template>
  <div class="dashboard">
    <TopBar />

    <div class="content">
    

      <div class="tab-content">
        <component :is="currentTabComponent" />
      </div>

         <RightTabBar 
        :tabs="tabs" 
        :currentTab="currentTab" 
        @switch-tab="currentTab = $event"
      />

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import TopBar from '../components/TopBar.vue';
import RightTabBar from '../components/RightTabBar.vue';
import DrillsTab from '../components/DrillsTab.vue';
import TimerTab from '../components/TimerTab.vue';

const tabs = [
  { id: 'TimerTab', label: 'Timer' },
  { id: 'DrillsTab', label: 'Drills' },
];

const currentTab = ref('DrillsTab');

const currentTabComponent = computed(() => {
  switch (currentTab.value) {
    case 'TimerTab':
      return TimerTab;
    case 'DrillsTab':
    default:
      return DrillsTab;
  }
});
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.content {
  display: flex;
  flex: 1;
}

.tab-content {
  flex: 1;
  padding: 16px;
}
</style>