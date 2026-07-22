import * as THREE from 'three'
import type { FactoryLayout } from '@/types/scene'

/**
 * 动态水面效果
 * 使用自定义 ShaderMaterial 实现多层正弦波浪
 */
export function buildWater(scene: THREE.Scene, layout: FactoryLayout) {
  const group = new THREE.Group()
  group.name = 'water'

  const { bounds, waterColor, coastlineZ } = layout
  const width = bounds.maxX - bounds.minX + 20
  const depth = bounds.maxZ - bounds.minZ + 20

  const vertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      vUv = uv;
      vec3 pos = position;

      float elevation = sin(pos.x * 0.15 + uTime * 0.8) * 0.12;
      elevation += sin(pos.y * 0.1 + uTime * 0.6) * 0.08;
      elevation += sin((pos.x + pos.y) * 0.08 + uTime * 0.4) * 0.05;

      pos.z += elevation;
      vElevation = elevation;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `

  const fragmentShader = `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      vec3 color = uColor;
      color += vElevation * 0.3;
      float alpha = uOpacity;
      gl_FragColor = vec4(color, alpha);
    }
  `

  const geometry = new THREE.PlaneGeometry(width, depth, 80, 60)
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(waterColor) },
      uOpacity: { value: 0.75 },
    },
    transparent: true,
    side: THREE.DoubleSide,
  })

  const water = new THREE.Mesh(geometry, material)
  water.rotation.x = -Math.PI / 2
  water.position.set(0, -0.6, (bounds.maxZ + bounds.minZ) / 2)
  water.userData = { isWater: true, material }
  group.add(water)

  // 海岸线标记线
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(bounds.minX - 10, -0.55, coastlineZ),
    new THREE.Vector3(bounds.maxX + 10, -0.55, coastlineZ),
  ])
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x4fc3f7,
    transparent: true,
    opacity: 0.3,
  })
  const coastLine = new THREE.Line(lineGeo, lineMat)
  group.add(coastLine)

  scene.add(group)
  return { group, material }
}
