<script setup lang="ts">
import { useLayers } from '@/composables/useLayers'

const { layers, toggle } = useLayers()

const layerList = [
  { key: 'terrain' as const, label: '山体地形', icon: '⛰️' },
  { key: 'roads' as const, label: '道路隧道', icon: '🛣️' },
  { key: 'water' as const, label: '水域', icon: '🌊' },
  { key: 'docks' as const, label: '船坞/码头', icon: '⚓' },
  { key: 'buildings' as const, label: '车间/仓库', icon: '🏭' },
  { key: 'cranes' as const, label: '门机', icon: '🏗️' },
  { key: 'ships' as const, label: '船舶', icon: '🚢' },
  { key: 'labels' as const, label: '标签', icon: '🏷️' },
]
</script>

<template>
  <div class="layer-panel glass-panel">
    <div class="panel-header">图层控制</div>
    <div class="layer-list">
      <label
        v-for="layer in layerList"
        :key="layer.key"
        class="layer-item"
      >
        <input
          type="checkbox"
          :checked="layers[layer.key]"
          @change="toggle(layer.key)"
        />
        <span class="layer-icon">{{ layer.icon }}</span>
        <span class="layer-label">{{ layer.label }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.layer-panel {
  position: absolute;
  top: 80px;
  left: 16px;
  width: 160px;
  padding: 12px;
  z-index: 50;
}

.panel-header {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text-primary);
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.layer-item:hover {
  color: var(--text-primary);
}

.layer-item input {
  width: 14px;
  height: 14px;
  accent-color: var(--accent);
  cursor: pointer;
}

.layer-icon {
  width: 16px;
  text-align: center;
}

.layer-label {
  flex: 1;
}
</style>
