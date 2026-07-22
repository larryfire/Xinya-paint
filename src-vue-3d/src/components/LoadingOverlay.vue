<script setup lang="ts">
defineProps<{
  loading?: boolean
  text?: string
}>()
</script>

<template>
  <transition name="fade">
    <div
      v-if="loading"
      class="loading-overlay"
    >
      <div class="loading-content">
        <div class="spinner" />
        <p class="loading-text">{{ text || '加载场景数据...' }}</p>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 22, 40, 0.85);
  backdrop-filter: blur(4px);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(34, 211, 238, 0.2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
