import * as THREE from 'three'

/**
 * 场景灯光系统
 * 包含环境光、主方向光（模拟太阳，带阴影）、补光、半球光
 */
export function buildLights(scene: THREE.Scene, ambientIntensity = 0.5) {
  // 环境光
  const ambientLight = new THREE.AmbientLight(0xcfd8dc, ambientIntensity)
  scene.add(ambientLight)

  // 主方向光（模拟太阳）
  const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2)
  dirLight.position.set(50, 80, 30)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  dirLight.shadow.camera.near = 0.5
  dirLight.shadow.camera.far = 250
  dirLight.shadow.camera.left = -80
  dirLight.shadow.camera.right = 80
  dirLight.shadow.camera.top = 80
  dirLight.shadow.camera.bottom = -80
  dirLight.shadow.bias = -0.0005
  scene.add(dirLight)

  // 补光方向光
  const fillLight = new THREE.DirectionalLight(0x88ccff, 0.4)
  fillLight.position.set(-40, 30, -40)
  scene.add(fillLight)

  // 半球光（天空/地面反射）
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2d3a2a, 0.3)
  scene.add(hemiLight)

  return { ambientLight, dirLight, fillLight, hemiLight }
}
