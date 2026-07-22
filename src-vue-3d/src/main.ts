import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.css'

// 创建 Vue 应用实例
const app = createApp(App)
app.use(createPinia())
app.mount('#app')
