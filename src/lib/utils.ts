import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** 合并 Tailwind 类名，自动去重和解决冲突 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 计算盈亏 = 结算成本 - 施工成本 */
export function calcProfitLoss(settlementCost: number, constructionCost: number): number {
  return settlementCost - constructionCost
}

/** 计算盈亏率 = (盈亏 / 结算成本) * 100 */
export function calcProfitLossRate(settlementCost: number, constructionCost: number): number {
  if (settlementCost === 0) return 0
  return ((settlementCost - constructionCost) / settlementCost) * 100
}

/** 计算总花费 = 工时 * 单价 */
export function calcTotalCost(manHours: number, hourlyRate: number): number {
  return manHours * hourlyRate
}

/** 格式化金额（人民币） */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(num)
}

/** 格式化日期 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })
}

/** 格式化日期时间 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

/** 格式化为 HH:mm */
export function formatHHMM(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
}

/** 根据记录日期字符串和 HH:mm 时间字符串构造 Date */
export function parseRecordDateTime(recordDate: string, time: string): Date {
  return new Date(`${recordDate}T${time}:00`)
}

/** 计算两个 Date 之间的小时数 */
export function calcHours(startTime: Date | string, endTime: Date | string): number {
  const startMs = new Date(startTime).getTime()
  const endMs = new Date(endTime).getTime()
  const diff = endMs - startMs
  return diff > 0 ? diff / (1000 * 60 * 60) : 0
}

/** 根据总工时计算计工数（一工=8小时） */
export function calcWorkDays(totalHours: number, hoursPerDay = 8): number {
  if (totalHours <= 0 || hoursPerDay <= 0) return 0
  return Math.round((totalHours / hoursPerDay) * 100) / 100
}
