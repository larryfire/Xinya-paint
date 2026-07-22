<script setup lang="ts">
import { ref } from 'vue'
import SceneCanvas from '@/components/SceneCanvas.vue'
import FactorySwitcher from '@/components/FactorySwitcher.vue'
import LayerPanel from '@/components/LayerPanel.vue'
import InfoPanel from '@/components/InfoPanel.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import { useSceneData } from '@/composables/useSceneData'
import type { FactoryId, ObjectUserData } from '@/types/scene'

const currentFactory = ref<FactoryId>(1)
const selectedObject = ref<ObjectUserData | null>(null)
const sceneCanvasRef = ref<InstanceType<typeof SceneCanvas> | null>(null)

const { loading } = useSceneData(() => currentFactory.value)

const handleSelect = (data: ObjectUserData | null) => {
  selectedObject.value = data
}

const handleCloseInfo = () => {
  selectedObject.value = null
}
</script>

<template>
  <div class="vue-3d-app">
    <SceneCanvas
      ref="sceneCanvasRef"
      :factory-id="currentFactory"
      @select="handleSelect"
    />

    <!-- 顶部厂区切换 -->
    <div class="top-center">
      <FactorySwitcher v-model="currentFactory" />
    </div>

    <!-- 左侧图层面板 -->
    <LayerPanel />

    <!-- 右侧详情面板 -->
    <InfoPanel
      v-if="selectedObject"
      :data="selectedObject"
      @close="handleCloseInfo"
    />

    <!-- 加载遮罩 -->
    <LoadingOverlay :loading="loading" />
  </div>
</template>

<style scoped>
.vue-3d-app {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.top-center {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
}
</style>
