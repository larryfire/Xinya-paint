"use client"

/**
 * Vue 3D 船厂可视化宿主页面
 * 通过 iframe 加载独立 Vue + Three.js 子应用，与现有 React 3D 模块隔离
 */
export default function Vue3DPage() {
  // 开发环境可配置为 Vite dev server，生产环境使用构建后的静态文件
  const src =
    process.env.NEXT_PUBLIC_VUE_3D_URL || "/static/vue-3d/index.html"

  return (
    <div className="fixed inset-0 z-0">
      <iframe
        src={src}
        className="h-full w-full border-0"
        allow="fullscreen"
        title="Vue 3D 船厂场景"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  )
}
