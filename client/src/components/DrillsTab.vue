<template>
  <div class="drills-tab">
    <header class="drills-header">
      <h1>Drills</h1>
      <p class="lead">Targeted practice for the skills that lower your times — pick a drill to train.</p>
    </header>

    <nav class="drill-nav">
      <button
        v-for="d in drills"
        :key="d.id"
        class="drill-pill"
        :class="{ active: current === d.id }"
        @click="current = d.id"
      >
        <span class="pill-icon">{{ d.icon }}</span>
        <span class="pill-text">
          <span class="pill-name">{{ d.name }}</span>
          <span class="pill-desc">{{ d.desc }}</span>
        </span>
      </button>
    </nav>

    <div class="drill-host">
      <component :is="activeComponent" :key="current" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CrossTrainer from './drills/CrossTrainer.vue'
import InspectionTrainer from './drills/InspectionTrainer.vue'
import MemoTrainer from './drills/MemoTrainer.vue'
import TpsMetronome from './drills/TpsMetronome.vue'

type DrillId = 'cross' | 'inspection' | 'memo' | 'tps'

const drills: { id: DrillId; name: string; desc: string; icon: string }[] = [
  { id: 'cross', name: 'Cross', desc: 'Efficiency & speed', icon: '✚' },
  { id: 'inspection', name: 'Inspection', desc: '15-second discipline', icon: '⏱' },
  { id: 'memo', name: 'Memo', desc: 'Blindfold memory', icon: '🧠' },
  { id: 'tps', name: 'TPS', desc: 'Turn speed & rhythm', icon: '🎵' },
]

const STORE_KEY = 'drills.lastTab'
const stored = localStorage.getItem(STORE_KEY) as DrillId | null
const current = ref<DrillId>(
  stored && drills.some((d) => d.id === stored) ? stored : 'cross',
)

const components: Record<DrillId, unknown> = {
  cross: CrossTrainer,
  inspection: InspectionTrainer,
  memo: MemoTrainer,
  tps: TpsMetronome,
}
watch(current, (id) => localStorage.setItem(STORE_KEY, id))
const activeComponent = computed(() => components[current.value])
</script>

<style scoped>
.drills-tab {
  max-width: 1000px;
  margin: 0 auto;
  color: #1f2937;
  padding-bottom: 40px;
}

.drills-header h1 { margin: 0; font-size: 1.7rem; }
.lead { margin: 4px 0 0; color: #6b7280; font-size: 0.95rem; }

.drill-nav {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
  margin: 20px 0 24px;
}

.drill-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.05s;
}
.drill-pill:hover { border-color: #c7d2fe; }
.drill-pill.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px #2563eb inset;
}

.pill-icon {
  font-size: 1.4rem;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eff6ff;
  border-radius: 10px;
  flex-shrink: 0;
}
.drill-pill.active .pill-icon { background: #dbeafe; }

.pill-text { display: flex; flex-direction: column; }
.pill-name { font-weight: 700; font-size: 0.95rem; }
.pill-desc { font-size: 0.78rem; color: #9ca3af; }

.drill-host {
  border-top: 1px solid #e5e7eb;
  padding-top: 24px;
}
</style>
