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

    <GameToasts />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import TopBar from '../components/TopBar.vue';
import RightTabBar from '../components/RightTabBar.vue';
import DrillsTab from '../components/DrillsTab.vue';
import TimerTab from '../components/TimerTab.vue';
import StatsTab from '../components/StatsTab.vue';
import AlgorithmsTab from '../components/AlgorithmsTab.vue';
import QuestsTab from '../components/QuestsTab.vue';
import GameToasts from '../components/GameToasts.vue';

const tabs = [
  { id: 'TimerTab', label: 'Timer' },
  { id: 'StatsTab', label: 'Stats' },
  { id: 'AlgorithmsTab', label: 'Algorithms' },
  { id: 'DrillsTab', label: 'Drills' },
  { id: 'QuestsTab', label: 'Quests' },
];

const currentTab = ref('TimerTab');

const currentTabComponent = computed(() => {
  switch (currentTab.value) {
    case 'TimerTab':
      return TimerTab;
    case 'StatsTab':
      return StatsTab;
    case 'AlgorithmsTab':
      return AlgorithmsTab;
    case 'QuestsTab':
      return QuestsTab;
    case 'DrillsTab':
    default:
      return DrillsTab;
  }
});
</script>

<style scoped>
.dashboard {
  /* Break out of the global #app grid/max-width (leftover Vite starter styles)
     so the dashboard owns the full viewport. */
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.content {
  display: flex;
  flex: 1;
  min-height: 0;
}

.tab-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  min-height: 0;
}
</style>