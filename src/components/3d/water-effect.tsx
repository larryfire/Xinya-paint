"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface WaterEffectProps {
  position?: [number, number, number]
  size?: [number, number] // [width, depth]
  opacity?: number
  color?: string
}

/**
 * 动态水面效果
 * 使用顶点动画模拟海浪波动
 * WebGIS暗色主题下使用深蓝绿色
 */
export function WaterEffect({
  position = [0, -0.3, 15],
  size = [120, 80],
  opacity = 0.75,
  color = "#0A3D5C",
}: WaterEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // 创建细分平面几何体用于顶点动画
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size[0], size[1], 80, 60)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [size])

  // 使用着色器材质实现波浪效果
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vHeight;
        uniform float uTime;

        void main() {
          vec3 pos = position;
          // 多层正弦波叠加
          float wave1 = sin(pos.x * 0.15 + uTime * 0.8) * cos(pos.z * 0.2 + uTime * 0.5) * 0.5;
          float wave2 = sin(pos.x * 0.3 + uTime * 1.2) * cos(pos.z * 0.35 - uTime * 0.7) * 0.3;
          float wave3 = sin(pos.x * 0.5 - uTime * 0.6) * sin(pos.z * 0.5 + uTime * 0.9) * 0.15;
          pos.y += wave1 + wave2 + wave3;
          vHeight = pos.y;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying float vHeight;
        uniform vec3 uColor;
        uniform float uOpacity;

        void main() {
          // 根据高度混合颜色（波峰亮，波谷暗）
          float heightFactor = vHeight * 0.8 + 0.5;
          vec3 waterColor = mix(uColor * 0.6, uColor * 1.2, heightFactor);
          // 添加细微条纹
          float stripe = sin(vUv.x * 40.0) * 0.05 + sin(vUv.y * 25.0) * 0.03;
          waterColor += stripe;
          gl_FragColor = vec4(waterColor, uOpacity);
        }
      `,
      transparent: true,
      depthWrite: true,
    })
  }, [color, opacity])

  // 每帧更新时间
  useFrame((_state, delta) => {
    if (material) {
      material.uniforms.uTime.value += delta
    }
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={position}
      receiveShadow
    />
  )
}
