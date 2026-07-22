<script setup lang="ts">
import type { ObjectUserData } from '@/types/scene'

defineProps<{
  data: ObjectUserData | null
}>()
</script>

<template>
  <div
    v-if="data"
    class="tooltip glass-panel"
  >
    <div class="tooltip-title">{{ data.name }}</div>
    <div class="tooltip-type">{{ data.type }}</div>
  </div>
</template>

<style scoped>
.tooltip {
  position: absolute;
  padding: 8px 12px;
  pointer-events: none;
  z-index: 60;
}

.tooltip-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.tooltip-type {
  font-size: 10px;
  color: var(--text-secondary);
  text-transform: capitalize;
}
</style>
