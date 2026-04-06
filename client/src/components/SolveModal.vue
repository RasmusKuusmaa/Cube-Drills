<template>
    <div v-if="show" class="modal-overlay" @click.self="close">
        <div class="modal">
            <h3>Solve Details</h3>

            <div v-if="solve">
                <p>Time: {{ (solve.time / 1000).toFixed(2) }}</p>
                <p>Scramble: {{ solve.scramble }}</p>
                <p>Date: {{ new Date(solve.date).toLocaleString() }}</p>
                <p>Penalty  {{ solve.penalty }}</p>
            </div>
        </div>
    </div>
    </template> 

<script setup lang="ts">
type Solve = {
    id: string
    time: number
    scramble: string
    date: string
    penalty?: 'OK' | '+2' | 'DNF'
}
defineProps<{
    show: boolean;
    solve:Solve | null;
    
}>();

const emit = defineEmits(['close'])

const close = () => emit('close');
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal {
    background: white;
    padding: 20px;
    border-radius: 10px;
}
</style>