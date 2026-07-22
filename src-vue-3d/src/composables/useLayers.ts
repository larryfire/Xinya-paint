import { reactive } from 'vue'
import type { LayerState } from '@/types/scene'

/**
 * 图层开关状态管理
 */
const layers = reactive<LayerState>({
  terrain: true,
  buildings: true,
  cranes: true,
  docks: true,
  roads: true,
  water: true,
  ships: true,
  labels: true,
})

export function useLayers() {
  const toggle = (key: keyof LayerState) => {
    layers[key] = !layers[key]
  }

  const setAll = (visible: boolean) => {
    ;(Object.keys(layers) as Array<keyof LayerState>).forEach((key) => {
      layers[key] = visible
    })
  }

  return {
    layers,
    toggle,
    setAll,
  }
}
