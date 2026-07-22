<script setup lang="ts">
import type { ObjectUserData } from '@/types/scene'

const props = defineProps<{
  data: ObjectUserData
}>()

const emit = defineEmits<{
  close: []
}>()

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

const fields = () => {
  if (!props.data.raw) return []
  const entries = Object.entries(props.data.raw).filter(
    ([key]) => !['id', 'factoryId', 'activeAttendance'].includes(key)
  )
  return entries.map(([key, value]) => ({
    key: translateKey(key),
    value: formatValue(value),
  }))
}

const translateKey = (key: string) => {
  const map: Record<string, string> = {
    name: '名称',
    type: '类型',
    status: '状态',
    length: '长度',
    width: '宽度',
    depth: '深度',
    height: '高度',
    rotation: '旋转角度',
    positionX: 'X 坐标',
    positionZ: 'Z 坐标',
    imo: 'IMO 编号',
    dockId: '关联船坞',
  }
  return map[key] || key
}
</script>

<template>
  <div class="info-panel glass-panel">
    <div class="panel-header">
      <span>详情信息</span>
      <button class="close-btn" @click="emit('close')">✕</button>
    </div>
    <div class="panel-body">
      <div class="info-row">
        <span class="info-label">类型</span>
        <span class="info-value type-badge">{{ data.type }}</span>
      </div>
      <div
        v-for="field in fields()"
        :key="field.key"
        class="info-row"
      >
        <span class="info-label">{{ field.key }}</span>
        <span class="info-value">{{ field.value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-panel {
  position: absolute;
  top: 80px;
  right: 16px;
  width: 260px;
  max-height: calc(100% - 100px);
  overflow-y: auto;
  padding: 16px;
  z-index: 50;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
}

.close-btn:hover {
  color: var(--text-primary);
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.info-label {
  color: var(--text-secondary);
}

.info-value {
  color: var(--text-primary);
  max-width: 60%;
  text-align: right;
  word-break: break-all;
}

.type-badge {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(34, 211, 238, 0.15);
  color: var(--accent);
}
</style>
