import { ref, type Ref } from 'vue'
import * as THREE from 'three'
import type { ObjectUserData } from '@/types/scene'

/**
 * 射线检测交互封装
 * 支持悬停提示与点击选中
 */
export function useRaycaster(
  container: Ref<HTMLElement | null>,
  camera: Ref<THREE.Camera | null>,
  scene: Ref<THREE.Scene | null>
) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const hovered = ref<ObjectUserData | null>(null)
  const selected = ref<ObjectUserData | null>(null)

  // 射线检测可交互对象
  const raycast = (clientX: number, clientY: number) => {
    if (!container.value || !camera.value || !scene.value) return null
    const rect = container.value.getBoundingClientRect()
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(pointer, camera.value)
    const hits = raycaster.intersectObjects(scene.value.children, true)

    // 向上查找带 userData 的父对象
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object
      while (obj) {
        if (obj.userData && obj.userData.type) {
          return obj.userData as ObjectUserData
        }
        obj = obj.parent
      }
    }
    return null
  }

  const onMouseMove = (e: MouseEvent) => {
    hovered.value = raycast(e.clientX, e.clientY)
  }

  const onClick = (e: MouseEvent) => {
    selected.value = raycast(e.clientX, e.clientY)
  }

  return {
    hovered,
    selected,
    onMouseMove,
    onClick,
    raycast,
  }
}
