import { ref, onMounted, onUnmounted } from 'vue'
import type { SceneData, SceneSettingsInfo, WeatherTideData, FactoryId } from '@/types/scene'

/**
 * 获取 3D 场景数据
 * 复用现有 Next.js API 接口，10 秒轮询刷新
 */
export function useSceneData(factoryIdRef: () => FactoryId) {
  const data = ref<SceneData | null>(null)
  const settings = ref<SceneSettingsInfo | null>(null)
  const weather = ref<WeatherTideData | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setInterval> | null = null

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    // 兼容 localStorage 中的 token（Cookie 失效时降级）
    const token = localStorage.getItem('xinya-auth-token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  const handleAuthError = () => {
    // 未登录时跳转到登录页
    const topWindow = window.top
    if (topWindow) {
      topWindow.location.href = '/login'
    } else {
      window.location.href = '/login'
    }
  }

  const fetchSceneData = async () => {
    try {
      const res = await fetch(`/api/scene-data?factoryId=${factoryIdRef()}`, {
        credentials: 'same-origin',
        headers: getHeaders(),
      })
      if (res.status === 401) {
        handleAuthError()
        return
      }
      const json = await res.json()
      if (json.success) {
        data.value = json.data
      } else {
        error.value = json.message || '获取场景数据失败'
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '网络错误'
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/scene-settings?factoryId=${factoryIdRef()}`, {
        credentials: 'same-origin',
        headers: getHeaders(),
      })
      if (res.status === 401) {
        handleAuthError()
        return
      }
      const json = await res.json()
      if (json.success) {
        settings.value = json.data
      }
    } catch {
      // 设置非关键，失败可忽略
    }
  }

  const fetchWeather = async () => {
    try {
      const res = await fetch('/api/weather-tide', {
        credentials: 'same-origin',
        headers: getHeaders(),
      })
      if (res.status === 401) {
        handleAuthError()
        return
      }
      const json = await res.json()
      if (json.success) {
        weather.value = json.data
      }
    } catch {
      // 天气非关键，失败可忽略
    }
  }

  const refresh = async () => {
    loading.value = true
    error.value = null
    await Promise.all([fetchSceneData(), fetchSettings(), fetchWeather()])
    loading.value = false
  }

  onMounted(() => {
    refresh()
    timer = setInterval(() => {
      fetchSceneData()
      fetchWeather()
    }, 10000)
  })

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  })

  return {
    data,
    settings,
    weather,
    loading,
    error,
    refresh,
  }
}
