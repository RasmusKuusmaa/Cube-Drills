<template>
  <svg :viewBox="`0 0 ${VB} ${VB}`" :width="size" :height="size" class="pll-diagram">
    <!-- Side strips (stickers adjacent to the U face) -->
    <rect
      v-for="(c, i) in diagram.back"
      :key="'b' + i"
      :x="CELL + i * CELL + GAP" :y="GAP" :width="CELL - GAP * 2" :height="STRIP - GAP * 2"
      :rx="2" :fill="hex(c)" stroke="#1f2937" stroke-width="0.6"
    />
    <rect
      v-for="(c, i) in diagram.front"
      :key="'f' + i"
      :x="CELL + i * CELL + GAP" :y="CELL * 4 + GAP" :width="CELL - GAP * 2" :height="STRIP - GAP * 2"
      :rx="2" :fill="hex(c)" stroke="#1f2937" stroke-width="0.6"
    />
    <rect
      v-for="(c, i) in diagram.left"
      :key="'l' + i"
      :x="GAP" :y="CELL + i * CELL + GAP" :width="STRIP - GAP * 2" :height="CELL - GAP * 2"
      :rx="2" :fill="hex(c)" stroke="#1f2937" stroke-width="0.6"
    />
    <rect
      v-for="(c, i) in diagram.right"
      :key="'r' + i"
      :x="CELL * 4 + GAP" :y="CELL + i * CELL + GAP" :width="STRIP - GAP * 2" :height="CELL - GAP * 2"
      :rx="2" :fill="hex(c)" stroke="#1f2937" stroke-width="0.6"
    />

    <!-- U face 3x3 -->
    <rect
      v-for="(c, i) in diagram.u"
      :key="'u' + i"
      :x="CELL + (i % 3) * CELL + GAP" :y="CELL + Math.floor(i / 3) * CELL + GAP"
      :width="CELL - GAP * 2" :height="CELL - GAP * 2"
      :rx="2" :fill="hex(c)" stroke="#1f2937" stroke-width="0.8"
    />

    <!-- Permutation arrows -->
    <template v-if="arrows">
      <line
        v-for="(a, i) in arrowLines"
        :key="'a' + i"
        :x1="a.x1" :y1="a.y1" :x2="a.x2" :y2="a.y2"
        stroke="#111827" :stroke-width="1.4"
        :marker-end="`url(#${markerId})`"
        :marker-start="a.both ? `url(#${markerId})` : undefined"
      />
      <defs>
        <marker :id="markerId" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#111827" />
        </marker>
      </defs>
    </template>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { buildPllDiagram, type FaceId, type SlotId } from '@/utils/cube'

const props = withDefaults(
  defineProps<{ alg: string; size?: number; arrows?: boolean }>(),
  { size: 100, arrows: false },
)

const CELL = 20
const GAP = 1.2
const STRIP = CELL
const VB = CELL * 5

// Unique marker id per instance so multiple diagrams don't clash.
const markerId = `arrow-${Math.random().toString(36).slice(2, 8)}`

const COLORS: Record<FaceId, string> = {
  U: '#Fdd835', // yellow
  D: '#FFFFFF', // white
  F: '#1FA84F', // green
  B: '#1565C0', // blue
  R: '#D32F2F', // red
  L: '#F57C00', // orange
}
const hex = (c: FaceId) => COLORS[c]

const diagram = computed(() => buildPllDiagram(props.alg))

// Pixel center of each top-layer slot within the 3x3 grid.
const SLOT_CELL: Record<SlotId, [number, number]> = {
  UBL: [0, 0], UB: [0, 1], UBR: [0, 2],
  UL: [1, 0], UR: [1, 2],
  UFL: [2, 0], UF: [2, 1], UFR: [2, 2],
}
const slotXY = (s: SlotId) => {
  const [row, col] = SLOT_CELL[s]
  return { x: CELL + col * CELL + CELL / 2, y: CELL + row * CELL + CELL / 2 }
}

// Shorten arrows so heads sit inside the cells, and merge 2-cycles into one
// double-headed arrow.
const arrowLines = computed(() => {
  const arr = diagram.value.arrows
  const seen = new Set<string>()
  const lines: { x1: number; y1: number; x2: number; y2: number; both: boolean }[] = []
  for (const a of arr) {
    const key = [a.from, a.to].sort().join('-')
    if (seen.has(key)) continue
    const reverse = arr.some((b) => b.from === a.to && b.to === a.from)
    seen.add(key)
    const p = slotXY(a.from)
    const q = slotXY(a.to)
    const dx = q.x - p.x
    const dy = q.y - p.y
    const len = Math.hypot(dx, dy) || 1
    const inset = 5
    lines.push({
      x1: p.x + (dx / len) * inset,
      y1: p.y + (dy / len) * inset,
      x2: q.x - (dx / len) * inset,
      y2: q.y - (dy / len) * inset,
      both: reverse,
    })
  }
  return lines
})
</script>

<style scoped>
.pll-diagram {
  display: block;
}
</style>
