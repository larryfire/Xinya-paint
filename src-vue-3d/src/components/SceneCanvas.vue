<script setup lang="ts">
import {
  ref,
  watch,
  onMounted,
  onUnmounted,
  computed,
  nextTick,
} from 'vue'
import * as THREE from 'three'
import { useThree } from '@/composables/useThree'
import { useSceneData } from '@/composables/useSceneData'
import { useRaycaster } from '@/composables/useRaycaster'
import { useLayers } from '@/composables/useLayers'
import { buildLights } from '@/scene/lights'
import { buildTerrain } from '@/scene/terrain'
import { buildWater } from '@/scene/water'
import { buildRoads } from '@/scene/roads'
import { buildBuildings } from '@/scene/buildings'
import { buildCranes } from '@/scene/cranes'
import { buildDocks } from '@/scene/docks'
import { buildShips } from '@/scene/ships'
import { buildLabels, createLabelRenderer } from '@/scene/labels'
import type { FactoryId, FactoryLayout, ObjectUserData } from '@/types/scene'

const props = defineProps<{
  factoryId: FactoryId
}>()

const emit = defineEmits<{
  select: [data: ObjectUserData | null]
}>()

const canvasRef = ref<HTMLElement | null>(null)

// useThree 返回的是普通 Three.js 对象（非 ref）
const { scene, camera, renderer, controls } = useThree(canvasRef)
const { data, settings, refresh } = useSceneData(() => props.factoryId)
const { layers } = useLayers()

// 为 useRaycaster 提供 computed ref
const { hovered, selected, onMouseMove, onClick } = useRaycaster(
  canvasRef,
  computed(() => camera),
  computed(() => scene)
)

// 场景图层组引用
const sceneGroups = ref<Record<string, THREE.Group | null>>({})
let labelRenderer: ReturnType<typeof createLabelRenderer> | null = null
let waterMaterial: THREE.ShaderMaterial | null = null
let rafId: number | null = null

// 加载静态布局
const loadLayout = async (factoryId: FactoryId): Promise<FactoryLayout> => {
  const name = factoryId === 1 ? 'xinya' : 'yatai'
  const module = await import(`@/assets/layouts/${name}.json`)
  return module.default as FactoryLayout
}

// 清理场景对象
const clearScene = () => {
  const childrenToRemove = scene.children.filter((c) => c.type !== 'Scene')
  childrenToRemove.forEach((c) => scene.remove(c))
  sceneGroups.value = {}
}

// 重建场景
const rebuildScene = async () => {
  clearScene()

  const layout = await loadLayout(props.factoryId)

  // 背景色和雾
  const bgColor = settings.value?.bgColor || layout.bgColor
  scene.background = new THREE.Color(bgColor)
  scene.fog = new THREE.Fog(
    bgColor,
    settings.value?.fogNear || 60,
    settings.value?.fogFar || 200
  )

  // 灯光
  buildLights(scene, settings.value?.ambientIntensity ?? 0.5)

  // 地形
  sceneGroups.value.terrain = buildTerrain(scene, layout)

  // 水域
  const waterResult = buildWater(scene, layout)
  sceneGroups.value.water = waterResult.group
  waterMaterial = waterResult.material

  // 道路
  sceneGroups.value.roads = buildRoads(scene, layout)

  // 动态数据对象
  if (data.value) {
    sceneGroups.value.docks = buildDocks(scene, data.value.docks)
    sceneGroups.value.buildings = buildBuildings(scene, data.value.docks)
    sceneGroups.value.cranes = buildCranes(
      scene,
      data.value.gantryCranes,
      data.value.docks,
      props.factoryId
    )
    sceneGroups.value.ships = buildShips(scene, data.value.ships)
    sceneGroups.value.labels = buildLabels(scene, data.value)
  }

  // 初始化 CSS2DRenderer
  if (canvasRef.value && !labelRenderer) {
    labelRenderer = createLabelRenderer(canvasRef.value)
  }

  applyLayerVisibility()
  animateCamera(layout.camera.position, layout.camera.target)
}

// 相机平滑过渡
const animateCamera = (
  targetPos: [number, number, number],
  targetLookAt: [number, number, number]
) => {
  const startPos = camera.position.clone()
  const startTarget = controls.target.clone()
  const endPos = new THREE.Vector3(...targetPos)
  const endTarget = new THREE.Vector3(...targetLookAt)
  const duration = 1000
  const startTime = performance.now()

  const tick = (now: number) => {
    const elapsed = now - startTime
    const t = Math.min(elapsed / duration, 1)
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

    camera.position.lerpVectors(startPos, endPos, ease)
    controls.target.lerpVectors(startTarget, endTarget, ease)
    controls.update()

    if (t < 1) {
      requestAnimationFrame(tick)
    }
  }
  requestAnimationFrame(tick)
}

// 应用图层可见性
const applyLayerVisibility = () => {
  ;(Object.keys(layers) as Array<keyof typeof layers>).forEach((key) => {
    const group = sceneGroups.value[key]
    if (group) {
      group.visible = layers[key]
    }
  })
}

// 渲染循环
const animate = () => {
  rafId = requestAnimationFrame(animate)

  const time = performance.now() * 0.001
  if (waterMaterial) {
    waterMaterial.uniforms.uTime.value = time
  }

  controls.update()
  renderer.render(scene, camera)

  if (labelRenderer) {
    labelRenderer.render(scene, camera)
  }
}

// 事件监听
const handleMouseMove = (e: MouseEvent) => {
  onMouseMove(e)
}

const handleClick = (e: MouseEvent) => {
  onClick(e)
  emit('select', selected.value)
}

const handleResize = () => {
  if (!canvasRef.value || !labelRenderer) return
  labelRenderer.setSize(
    canvasRef.value.clientWidth,
    canvasRef.value.clientHeight
  )
}

onMounted(async () => {
  await nextTick()
  if (canvasRef.value) {
    canvasRef.value.addEventListener('mousemove', handleMouseMove)
    canvasRef.value.addEventListener('click', handleClick)
    window.addEventListener('resize', handleResize)
  }
  animate()
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('mousemove', handleMouseMove)
    canvasRef.value.removeEventListener('click', handleClick)
  }
  window.removeEventListener('resize', handleResize)
  if (labelRenderer) {
    labelRenderer.domElement.remove()
  }
})

// 监听厂区变化重建场景
watch(() => props.factoryId, rebuildScene)

// 等待数据加载完成后重建场景
watch(() => data.value, rebuildScene)

// 监听图层开关
watch(layers, applyLayerVisibility, { deep: true })

// 监听悬停，改变光标
watch(hovered, (val) => {
  if (canvasRef.value) {
    canvasRef.value.style.cursor = val ? 'pointer' : 'grab'
  }
})

// 暴露刷新方法
defineExpose({ refresh })
</script>

<template>
  <div
    ref="canvasRef"
    class="scene-canvas"
    :class="{ 'cursor-pointer': hovered }"
  />
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer !important;
}
</style>
