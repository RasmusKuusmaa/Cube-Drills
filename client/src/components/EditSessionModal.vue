<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>Edit Session</h3>
      <input
        v-model="sessionName"
        type="text"
        placeholder="Enter session name"
        @keyup.enter="$emit('confirm', sessionName.trim())"
        ref="inputRef"
      />
      <div class="modal-buttons">
        <button @click="$emit('confirm', sessionName.trim())">Update</button>
        <button @click="$emit('delete')">Delete</button>
        <button @click="$emit('close')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

interface Props {
  show: boolean
  initialName?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  confirm: [name: string]
  delete: []
  close: []
}>()

const sessionName = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => props.show, (newShow) => {
  if (newShow) {
    sessionName.value = props.initialName || ''
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 300px;
  text-align: center;
}

.modal-content h3 {
  margin-top: 0;
}

.modal-content input {
  width: 100%;
  padding: 8px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.modal-buttons {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.modal-buttons button {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.modal-buttons button:first-child {
  background-color: #007bff;
  color: white;
}

.modal-buttons button:nth-child(2) {
  background-color: #dc3545;
  color: white;
}

.modal-buttons button:last-child {
  background-color: #6c757d;
  color: white;
}
</style>