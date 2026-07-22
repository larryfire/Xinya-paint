<script setup lang="ts">
import type { FactoryId } from '@/types/scene'

const currentFactory = defineModel<FactoryId>('modelValue', { required: true })

const factories = [
  { id: 1 as FactoryId, name: '鑫亚船厂' },
  { id: 2 as FactoryId, name: '亚泰船厂' },
]
</script>

<template>
  <div class="factory-switcher glass-panel">
    <button
      v-for="factory in factories"
      :key="factory.id"
      class="factory-btn"
      :class="{ active: currentFactory === factory.id }"
      @click="currentFactory = factory.id"
    >
      {{ factory.name }}
    </button>
  </div>
</template>

<style scoped>
.factory-switcher {
  display: flex;
  gap: 4px;
  padding: 4px;
}

.factory-btn {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.factory-btn:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.factory-btn.active {
  background: rgba(34, 211, 238, 0.15);
  color: var(--accent);
}
</style>
