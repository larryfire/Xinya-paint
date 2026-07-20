"use client"

/**
 * WebGIS场景灯光系统
 * 暗色主题下使用冷色调环境光 + 定向主光 + 半球光
 */
export function SceneLights({
  ambientIntensity = 0.5,
}: {
  ambientIntensity?: number
}) {
  return (
    <>
      {/* 环境光 — 冷色调 */}
      <ambientLight intensity={ambientIntensity} color="#1A3A5C" />

      {/* 主方向光 — 模拟太阳 */}
      <directionalLight
        position={[40, 60, 20]}
        intensity={0.7}
        color="#FFF5E6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
      />

      {/* 辅助方向光 — 补光 */}
      <directionalLight
        position={[-30, 20, -20]}
        intensity={0.2}
        color="#87CEEB"
      />

      {/* 半球光 — 天空/地面 */}
      <hemisphereLight
        args={["#1A3A5C", "#1A2A1A", 0.25]}
      />

      {/* 海面反射点光源 */}
      <pointLight
        position={[0, 5, 20]}
        intensity={0.3}
        color="#00D4FF"
        distance={50}
      />
    </>
  )
}
