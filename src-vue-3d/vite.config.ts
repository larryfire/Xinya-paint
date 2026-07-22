import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Vite 配置：独立 Vue 3D 子项目
export default defineConfig({
  plugins: [vue()],
  // 部署到 /static/vue-3d/ 子路径，避免与 Next.js /vue-3d 路由冲突
  base: '/static/vue-3d/',
  build: {
    // 构建产物输出到 Next.js public 目录，由 Next.js 统一 serving
    outDir: resolve(__dirname, '../public/static/vue-3d'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 three 单独拆包，便于缓存和减小主包体积
          three: ['three'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    cors: true,
  },
})
