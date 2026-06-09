<template>
  <div class="quests-tab">
    <header class="quests-header">
      <h1>Quests</h1>
      <p class="lead">Earn XP, keep your streak alive, and chip away at long-term goals.</p>
    </header>

    <!-- Level + streak hero -->
    <section class="hero">
      <div class="level-card">
        <div class="level-badge">{{ level.level }}</div>
        <div class="level-info">
          <div class="level-row">
            <span class="level-label">Level {{ level.level }}</span>
            <span class="xp-total">{{ state.xp }} XP</span>
          </div>
          <div class="xp-bar">
            <div class="xp-fill" :style="{ width: `${Math.round(level.progress * 100)}%` }"></div>
          </div>
          <div class="xp-next">{{ level.neededForNext - level.intoLevel }} XP to level {{ level.level + 1 }}</div>
        </div>
      </div>

      <div class="streak-card">
        <div class="streak-flame">🔥</div>
        <div class="streak-num">{{ streak.current }}</div>
        <div class="streak-label">day streak</div>
        <div class="streak-best">best {{ streak.longest }}</div>
      </div>
    </section>

    <!-- Daily challenges -->
    <section class="block">
      <div class="block-head">
        <h2>Daily challenges</h2>
        <span class="resets-in">resets in {{ resetCountdown }}</span>
      </div>
      <div class="daily-grid">
        <div
          v-for="c in dailyChallenges"
          :key="c.id"
          class="challenge"
          :class="{ done: c.done }"
        >
          <div class="challenge-top">
            <span class="challenge-icon">{{ c.done ? '✓' : c.icon }}</span>
            <span class="challenge-text">
              <span class="challenge-title">{{ c.title }}</span>
              <span class="challenge-desc">{{ c.desc }}</span>
            </span>
            <span class="challenge-xp">+{{ c.xp }}</span>
          </div>
          <div class="prog-bar">
            <div class="prog-fill" :style="{ width: `${pct(c.progress, c.target)}%` }"></div>
          </div>
          <div class="prog-label">{{ Math.min(c.progress, c.target) }} / {{ c.target }}</div>
        </div>
      </div>
    </section>

    <!-- Achievements -->
    <section class="block">
      <div class="block-head">
        <h2>Achievements</h2>
        <span class="ach-count">{{ unlockedCount }} / {{ achievementsView.length }} unlocked</span>
      </div>

      <div v-for="group in groupedAchievements" :key="group.name" class="ach-group">
        <h3 class="ach-group-title">{{ group.name }}</h3>
        <div class="ach-grid">
          <div
            v-for="a in group.items"
            :key="a.id"
            class="ach"
            :class="{ unlocked: a.unlocked }"
            :title="a.desc"
          >
            <span class="ach-icon">{{ a.icon }}</span>
            <span class="ach-body">
              <span class="ach-title">{{ a.title }}</span>
              <span class="ach-desc">{{ a.desc }}</span>
              <span v-if="!a.unlocked && a.target > 1" class="ach-prog">
                <span class="ach-prog-bar"><span class="ach-prog-fill" :style="{ width: `${pct(a.progress, a.target)}%` }"></span></span>
                <span class="ach-prog-num">{{ a.progress }} / {{ a.target }}</span>
              </span>
              <span v-else class="ach-status" :class="{ on: a.unlocked }">
                {{ a.unlocked ? 'Unlocked' : 'Locked' }} · +{{ a.xp }} XP
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <button class="reset-link" @click="confirmReset">Reset all progress</button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useGamification } from '@/composables/useGamification'

const {
  state,
  level,
  streak,
  dailyChallenges,
  achievementsView,
  unlockedCount,
  resetProgress,
} = useGamification()

const pct = (value: number, target: number) =>
  target ? Math.min(100, Math.round((value / target) * 100)) : 0

// Group achievements by their `group`, preserving catalog order.
const groupedAchievements = computed(() => {
  const groups: { name: string; items: typeof achievementsView.value }[] = []
  for (const a of achievementsView.value) {
    let g = groups.find((x) => x.name === a.group)
    if (!g) {
      g = { name: a.group, items: [] }
      groups.push(g)
    }
    g.items.push(a)
  }
  return groups
})

// Live countdown to local midnight for the daily reset.
const now = ref(Date.now())
let tick: number | null = null
const resetCountdown = computed(() => {
  const d = new Date(now.value)
  d.setHours(24, 0, 0, 0)
  const ms = d.getTime() - now.value
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${String(m).padStart(2, '0')}m`
})

const confirmReset = () => {
  if (confirm('Reset all gamification progress (XP, level, streak, achievements)? This cannot be undone.')) {
    resetProgress()
  }
}

onMounted(() => {
  tick = window.setInterval(() => (now.value = Date.now()), 30000)
})
onUnmounted(() => {
  if (tick) clearInterval(tick)
})
</script>

<style scoped>
.quests-tab {
  max-width: 1000px;
  margin: 0 auto;
  color: #1f2937;
  padding-bottom: 48px;
}

.quests-header h1 { margin: 0; font-size: 1.7rem; }
.lead { margin: 4px 0 0; color: #6b7280; font-size: 0.95rem; }

/* ---- Hero ---- */
.hero {
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: 14px;
  margin: 22px 0 28px;
}
@media (max-width: 620px) {
  .hero { grid-template-columns: 1fr; }
}

.level-card {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 22px;
  background: linear-gradient(135deg, #eff6ff, #f5f3ff);
  border: 1px solid #e0e7ff;
  border-radius: 16px;
}

.level-badge {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  font-size: 1.8rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
}

.level-info { flex: 1; min-width: 0; }
.level-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
.level-label { font-weight: 700; font-size: 1.05rem; }
.xp-total { font-family: 'Courier New', monospace; color: #6b7280; font-size: 0.9rem; }

.xp-bar { height: 12px; background: #e0e7ff; border-radius: 6px; overflow: hidden; }
.xp-fill { height: 100%; background: linear-gradient(90deg, #2563eb, #8b5cf6); border-radius: 6px; transition: width 0.4s ease; }
.xp-next { margin-top: 6px; font-size: 0.78rem; color: #9ca3af; }

.streak-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 16px;
}
.streak-flame { font-size: 1.8rem; line-height: 1; }
.streak-num { font-size: 2.2rem; font-weight: 800; color: #ea580c; line-height: 1.1; }
.streak-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #9a3412; }
.streak-best { font-size: 0.75rem; color: #c2410c; margin-top: 4px; }

/* ---- Blocks ---- */
.block { margin-bottom: 30px; }
.block-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.block-head h2 { margin: 0; font-size: 1.15rem; }
.resets-in, .ach-count { font-size: 0.82rem; color: #9ca3af; }

/* ---- Daily challenges ---- */
.daily-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.challenge {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
  background: white;
}
.challenge.done {
  border-color: #bbf7d0;
  background: #f0fdf4;
}
.challenge-top { display: flex; align-items: flex-start; gap: 10px; }
.challenge-icon {
  font-size: 1.3rem;
  width: 34px; height: 34px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: #eff6ff; border-radius: 9px;
}
.challenge.done .challenge-icon { background: #dcfce7; color: #16a34a; font-weight: 800; }
.challenge-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.challenge-title { font-weight: 700; font-size: 0.92rem; }
.challenge-desc { font-size: 0.8rem; color: #6b7280; }
.challenge-xp { font-family: 'Courier New', monospace; font-weight: 700; color: #2563eb; font-size: 0.85rem; }

.prog-bar { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin: 12px 0 4px; }
.prog-fill { height: 100%; background: #2563eb; border-radius: 4px; transition: width 0.4s ease; }
.challenge.done .prog-fill { background: #16a34a; }
.prog-label { font-size: 0.75rem; color: #9ca3af; font-family: 'Courier New', monospace; text-align: right; }

/* ---- Achievements ---- */
.ach-group { margin-bottom: 18px; }
.ach-group-title {
  font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;
  color: #9ca3af; margin: 0 0 10px;
}
.ach-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 10px;
}
.ach {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  opacity: 0.7;
}
.ach.unlocked {
  opacity: 1;
  border-color: #bbf7d0;
  background: #f6fef9;
}
.ach-icon {
  font-size: 1.6rem;
  width: 42px; height: 42px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: #f3f4f6; border-radius: 10px;
  filter: grayscale(1);
}
.ach.unlocked .ach-icon { background: #dcfce7; filter: none; }
.ach-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.ach-title { font-weight: 700; font-size: 0.9rem; }
.ach-desc { font-size: 0.78rem; color: #6b7280; }
.ach-prog { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.ach-prog-bar { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
.ach-prog-fill { display: block; height: 100%; background: #94a3b8; border-radius: 3px; }
.ach-prog-num { font-size: 0.72rem; color: #9ca3af; font-family: 'Courier New', monospace; }
.ach-status { font-size: 0.75rem; color: #9ca3af; margin-top: 4px; }
.ach-status.on { color: #16a34a; font-weight: 600; }

.reset-link {
  border: none;
  background: none;
  color: #9ca3af;
  font-size: 0.8rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}
.reset-link:hover { color: #dc2626; }
</style>
