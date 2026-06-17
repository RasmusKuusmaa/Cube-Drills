<template>
    <div v-if="show" class="modal-overlay" @click.self="close">
        <div class="modal">
            <h3>Solve Details</h3>

            <div v-if="solve">
                <p>Time: {{ formatSolve(solve) }}</p>
                <p>Scramble: {{ solve.scramble }}</p>
                <p>Date: {{ new Date(solve.date).toLocaleString() }}</p>

                <div class="phases" v-if="phaseRows.length">
                    <div v-for="(row, i) in phaseRows" :key="i" class="phase-row">
                        <span class="phase-label">{{ row.label }}</span>
                        <span class="phase-time">{{ formatMs(row.duration) }}</span>
                    </div>
                </div>

                <div class="field">
                    <label>Penalty</label>
                    <div class="penalty-buttons">
                        <button v-for="option in penalties" :key="option" type="button"
                            :class="{ active: penalty === option }" @click="penalty = option">
                            {{ option }}
                        </button>
                    </div>
                </div>

                <div class="field">
                    <label for="solve-comment">Comment</label>
                    <textarea id="solve-comment" v-model="comment" rows="3"
                        placeholder="Add a comment..."></textarea>
                </div>

                <div class="actions">
                    <button class="delete" type="button" @click="onDelete">Delete</button>
                    <div class="actions-right">
                        <button type="button" @click="close">Cancel</button>
                        <button class="save" type="button" :disabled="!dirty" @click="onSave">Save</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { formatMs, formatSolve, type Penalty } from '@/utils/solves'

type Solve = {
    id: string
    time: number
    scramble: string
    date: string
    penalty?: Penalty
    comment?: string | null
    phases?: number[] | null
}

const props = defineProps<{
    show: boolean;
    solve: Solve | null;
}>();

const emit = defineEmits<{
    close: []
    update: [id: string, data: { penalty: Penalty; comment: string | null }]
    delete: [id: string]
}>()

const penalties: Penalty[] = ['OK', '+2', 'DNF']

const penalty = ref<Penalty>('OK')
const comment = ref('')

watch(() => props.solve, (solve) => {
    penalty.value = solve?.penalty ?? 'OK'
    comment.value = solve?.comment ?? ''
}, { immediate: true })

// Cumulative phase splits -> labelled per-phase durations.
const phaseRows = computed(() => {
    const phases = props.solve?.phases
    if (!phases || phases.length < 2) return []
    const labels =
        phases.length === 4
            ? ['Cross', 'F2L', 'OLL', 'PLL']
            : phases.map((_, i) => `Phase ${i + 1}`)
    return phases.map((cumulative, i) => ({
        label: labels[i],
        duration: cumulative - (i > 0 ? phases[i - 1]! : 0),
    }))
})

const dirty = computed(() => {
    if (!props.solve) return false
    const originalComment = props.solve.comment ?? ''
    const originalPenalty = props.solve.penalty ?? 'OK'
    return penalty.value !== originalPenalty || comment.value !== originalComment
})

const close = () => emit('close');

const onSave = () => {
    if (!props.solve) return
    emit('update', props.solve.id, {
        penalty: penalty.value,
        comment: comment.value.trim() === '' ? null : comment.value.trim(),
    })
    emit('close')
}

const onDelete = () => {
    if (!props.solve) return
    if (confirm('Delete this solve?')) {
        emit('delete', props.solve.id)
        emit('close')
    }
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal {
    background: white;
    padding: 20px;
    border-radius: 10px;
    width: 360px;
    max-width: 90vw;
}

.phases {
    margin: 12px 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: 'Courier New', monospace;
}

.phase-row {
    display: flex;
    justify-content: space-between;
    padding: 3px 8px;
    border-radius: 6px;
    background: #f9fafb;
    border: 1px solid #eee;
}

.phase-time {
    font-weight: 700;
}

.field {
    margin: 14px 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.field label {
    font-weight: 600;
    font-size: 0.9rem;
}

.penalty-buttons {
    display: flex;
    gap: 8px;
}

.penalty-buttons button {
    flex: 1;
    padding: 6px 0;
    border: 1px solid #ccc;
    background: white;
    border-radius: 6px;
    cursor: pointer;
}

.penalty-buttons button.active {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
}

textarea {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-family: inherit;
}

.actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 18px;
}

.actions-right {
    display: flex;
    gap: 8px;
}

.actions button {
    padding: 6px 14px;
    border-radius: 6px;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
}

.actions button.delete {
    color: #dc2626;
    border-color: #dc2626;
}

.actions button.save {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
}

.actions button.save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
