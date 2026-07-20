/**
 * 舟山港区天气潮汐模拟器
 * 生成逼真的模拟天气、潮汐数据，用于3D大屏展示
 * 后续可替换为和风天气API真实数据
 */

export interface WeatherTideData {
  temperature: number
  weather: string
  weatherIcon: string
  windDirection: string
  windSpeed: number
  humidity: number
  pressure: number
  visibility: number
  tideHeight: number
  tideTrend: "rising" | "falling"
  nextHighTide: { time: string; height: number }
  nextLowTide: { time: string; height: number }
  bestDockTimes: { start: string; end: string; score: number; label: string }[]
  hourlyForecast: { time: string; tideHeight: number }[]
}

/** 舟山地区天气类型（按季节概率分布） */
const WEATHER_TYPES: Record<string, { icon: string; label: string; weight: number }[]> = {
  summer: [
    { icon: "☀️", label: "晴", weight: 35 },
    { icon: "⛅", label: "多云", weight: 30 },
    { icon: "🌧️", label: "阵雨", weight: 20 },
    { icon: "⛈️", label: "雷阵雨", weight: 10 },
    { icon: "🌊", label: "阴", weight: 5 },
  ],
  winter: [
    { icon: "☀️", label: "晴", weight: 25 },
    { icon: "⛅", label: "多云", weight: 35 },
    { icon: "🌧️", label: "小雨", weight: 20 },
    { icon: "🌊", label: "阴", weight: 15 },
    { icon: "🌬️", label: "大风", weight: 5 },
  ],
  spring: [
    { icon: "☀️", label: "晴", weight: 30 },
    { icon: "⛅", label: "多云", weight: 30 },
    { icon: "🌧️", label: "小雨", weight: 25 },
    { icon: "🌊", label: "阴", weight: 10 },
    { icon: "🌫️", label: "雾", weight: 5 },
  ],
  autumn: [
    { icon: "☀️", label: "晴", weight: 40 },
    { icon: "⛅", label: "多云", weight: 30 },
    { icon: "🌧️", label: "小雨", weight: 15 },
    { icon: "🌊", label: "阴", weight: 10 },
    { icon: "🌬️", label: "大风", weight: 5 },
  ],
}

/** 风向列表 */
const WIND_DIRECTIONS = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"]

/**
 * 加权随机选择
 */
function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0)
  let r = Math.random() * total
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item
  }
  return items[items.length - 1]
}

/**
 * 获取当前季节
 */
function getSeason(): keyof typeof WEATHER_TYPES {
  const month = new Date().getMonth() + 1
  if (month >= 6 && month <= 8) return "summer"
  if (month >= 9 && month <= 11) return "autumn"
  if (month >= 3 && month <= 5) return "spring"
  return "winter"
}

/**
 * 基于种子的伪随机数（确保同一分钟内数据稳定）
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

/**
 * 计算潮汐高度（简化调和常数法，模拟舟山半日潮）
 * 舟山港：M2分潮振幅约1.5m，S2分潮约0.5m，K1分潮约0.3m
 */
function calcTideHeight(timestamp: number): number {
  const hoursSinceEpoch = timestamp / 3600000
  // M2 主太阴半日分潮（周期12.42小时）
  const m2 = 1.5 * Math.sin((hoursSinceEpoch / 12.42) * Math.PI * 2)
  // S2 主太阳半日分潮（周期12小时）
  const s2 = 0.5 * Math.sin((hoursSinceEpoch / 12.0) * Math.PI * 2 + 1.2)
  // K1 太阴太阳合成日分潮（周期23.93小时）
  const k1 = 0.3 * Math.sin((hoursSinceEpoch / 23.93) * Math.PI * 2 + 0.7)
  // O1 主太阴日分潮（周期25.82小时）
  const o1 = 0.2 * Math.sin((hoursSinceEpoch / 25.82) * Math.PI * 2 + 1.8)
  // 平均海平面
  const msl = 2.5
  return msl + m2 + s2 + k1 + o1
}

/**
 * 寻找最近的潮汐极值
 */
function findNearestTideExtreme(
  timestamp: number,
  type: "high" | "low",
  lookAheadHours: number = 13
): { time: string; height: number } {
  const stepMinutes = 10
  let bestTime = timestamp
  let bestHeight = calcTideHeight(timestamp)

  for (let m = 0; m < lookAheadHours * 60; m += stepMinutes) {
    const t = timestamp + m * 60000
    const h = calcTideHeight(t)
    if (type === "high" && h > bestHeight) {
      bestHeight = h
      bestTime = t
    }
    if (type === "low" && h < bestHeight) {
      bestHeight = h
      bestTime = t
    }
  }

  return {
    time: new Date(bestTime).toISOString(),
    height: Math.round(bestHeight * 100) / 100,
  }
}

/**
 * 计算最佳进出坞时段
 * 条件：潮高>2.5m + 白天(6:00-18:00) + 平潮前后1小时
 */
function calcBestDockTimes(
  timestamp: number
): { start: string; end: string; score: number; label: string }[] {
  const results: { start: string; end: string; score: number; label: string }[] = []
  const now = new Date(timestamp)
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime()
  const dayEnd = dayStart + 24 * 3600000

  // 每30分钟检查一次
  for (let t = dayStart; t < dayEnd; t += 30 * 60000) {
    const h = calcTideHeight(t)
    const hour = new Date(t).getHours()

    // 潮高足够 + 白天
    if (h >= 2.5 && hour >= 6 && hour <= 18) {
      const dh =
        (calcTideHeight(t + 30 * 60000) - calcTideHeight(t - 30 * 60000)) /
        3600000
      // 平潮附近（潮位变化率小）得分更高
      const rateScore = Math.max(0, 1 - Math.abs(dh) * 10)
      // 上午时段更优
      const timeScore = hour >= 8 && hour <= 11 ? 1 : 0.6
      const score = Math.round((rateScore * 0.6 + timeScore * 0.4) * 100)

      if (score >= 50) {
        // 合并相近时段
        const startTime = new Date(t - 30 * 60000)
        const endTime = new Date(t + 90 * 60000)
        const existing = results.find(
          (r) => Math.abs(new Date(r.start).getTime() - startTime.getTime()) < 3600000
        )
        if (!existing) {
          results.push({
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            score,
            label: score >= 80 ? "最佳" : score >= 65 ? "适宜" : "可操作",
          })
        }
      }
    }
  }

  // 按得分排序，取前3个
  return results.sort((a, b) => b.score - a.score).slice(0, 3)
}

/**
 * 生成完整的天气潮汐模拟数据
 */
export function generateWeatherTideData(
  timestamp: number = Date.now()
): WeatherTideData {
  const date = new Date(timestamp)
  const season = getSeason()
  const seed = Math.floor(timestamp / 60000) // 每分钟更新一次
  const rand = (offset: number) => seededRandom(seed + offset)

  // 天气
  const weatherTypes = WEATHER_TYPES[season]
  const weather = weightedRandom(weatherTypes)

  // 温度（根据季节和天气）
  const baseTemp: Record<string, [number, number]> = {
    summer: [26, 35],
    winter: [0, 12],
    spring: [12, 22],
    autumn: [15, 25],
  }
  const [tempMin, tempMax] = baseTemp[season]
  const tempAdjust = weather.label.includes("雨") ? -3 : weather.label === "阴" ? -1 : 0
  const temperature = Math.round(tempMin + rand(1) * (tempMax - tempMin) + tempAdjust)

  // 风向（舟山夏季多东南风，冬季多偏北风）
  const windBias: Record<string, number> = {
    summer: 4, // 东南风
    winter: 1, // 东北风
    spring: 3, // 东风
    autumn: 2, // 东北偏东
  }
  const windIdx = Math.floor((rand(2) * 3 + windBias[season]) % 8)
  const windDirection = WIND_DIRECTIONS[windIdx]

  // 风速
  const windSpeed = Math.round((1 + rand(3) * 8) * 10) / 10

  // 湿度
  const humidity = Math.round(50 + rand(4) * 45)

  // 气压（hPa）
  const pressure = Math.round(1000 + rand(5) * 25)

  // 能见度
  const visibility =
    weather.label === "雾"
      ? Math.round((0.5 + rand(6) * 1.5) * 10) / 10
      : Math.round((5 + rand(7) * 15) * 10) / 10

  // 潮汐
  const tideHeight = Math.round(calcTideHeight(timestamp) * 100) / 100
  const nextTide = calcTideHeight(timestamp + 600000)
  const tideTrend: "rising" | "falling" = nextTide > tideHeight ? "rising" : "falling"

  const nextHighTide = findNearestTideExtreme(timestamp, "high")
  const nextLowTide = findNearestTideExtreme(timestamp, "low")

  // 最佳进出坞时段
  const bestDockTimes = calcBestDockTimes(timestamp)

  // 24小时潮汐预报（每2小时一个点）
  const hourlyForecast: { time: string; tideHeight: number }[] = []
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
  for (let h = 0; h < 24; h += 2) {
    const t = dayStart.getTime() + h * 3600000
    hourlyForecast.push({
      time: new Date(t).toISOString(),
      tideHeight: Math.round(calcTideHeight(t) * 100) / 100,
    })
  }

  return {
    temperature,
    weather: weather.label,
    weatherIcon: weather.icon,
    windDirection,
    windSpeed,
    humidity,
    pressure,
    visibility,
    tideHeight,
    tideTrend,
    nextHighTide,
    nextLowTide,
    bestDockTimes,
    hourlyForecast,
  }
}
