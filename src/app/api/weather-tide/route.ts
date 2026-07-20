import { NextRequest } from "next/server"
import { success, error } from "@/lib/api-response"
import { generateWeatherTideData } from "@/lib/weather-simulator"

/**
 * GET /api/weather-tide
 * 返回当前天气、潮汐、气压等模拟数据
 * 后续可替换为和风天气API真实数据
 */
export async function GET(_request: NextRequest) {
  try {
    const data = generateWeatherTideData()
    return success(data)
  } catch (err) {
    console.error("天气潮汐数据生成失败:", err)
    return error("INTERNAL_ERROR", "获取天气潮汐数据失败", 500)
  }
}
