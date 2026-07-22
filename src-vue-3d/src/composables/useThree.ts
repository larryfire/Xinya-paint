import { onMounted, onUnmounted, type Ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Three.js 场景初始化封装
 * 创建 scene、camera、renderer、controls，并处理窗口缩放与资源释放
 */
export function useThree(container: Ref<HTMLElement | null>) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 250)
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  const controls = new OrbitControls(camera, renderer.domElement)

  // 相机初始位置
  camera.position.set(0, 35, 28)

  // 渲染器配置
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  // 轨道控制器配置
  controls.target.set(0, 0, 5)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minPolarAngle = 0.2
  controls.maxPolarAngle = Math.PI / 2.3
  controls.minDistance = 12
  controls.maxDistance = 80
  controls.screenSpacePanning = false

  // 窗口大小变化处理
  const handleResize = () => {
    if (!container.value) return
    const { clientWidth, clientHeight } = container.value
    camera.aspect = clientWidth / clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(clientWidth, clientHeight)
  }

  onMounted(() => {
    if (!container.value) return
    container.value.appendChild(renderer.domElement)
    handleResize()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    controls.dispose()
    renderer.dispose()

    // 释放场景中的所有几何体、材质和纹理
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) {
        mesh.geometry.dispose()
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m: THREE.Material) => m.dispose())
        } else {
          mesh.material.dispose()
        }
      }
      const textured = obj as THREE.Mesh<THREE.BufferGeometry, THREE.Material> & {
        texture?: THREE.Texture
      }
      if (textured.texture) {
        textured.texture.dispose()
      }
    })
  })

  return {
    scene,
    camera,
    renderer,
    controls,
    handleResize,
  }
}
