import { NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { error } from "@/lib/api-response"
import { getWorkHourFilter } from "@/lib/permissions"
import { formatDate, formatHHMM, calcHours } from "@/lib/utils"

/** 导出每日工时记录为 Excel（浏览器下载） */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "work_hour:export")

    const { searchParams } = request.nextUrl
    const recordDateFrom = searchParams.get("recordDateFrom") || undefined
    const recordDateTo = searchParams.get("recordDateTo") || undefined
    const shipId = searchParams.get("shipId") ? parseInt(searchParams.get("shipId")!) : undefined
    const teamId = searchParams.get("teamId") ? parseInt(searchParams.get("teamId")!) : undefined

    const where: Record<string, unknown> = await getWorkHourFilter(auth.role, auth.userId, auth.teamId)
    if (shipId) where.shipId = shipId
    if (teamId) where.teamId = teamId
    if (recordDateFrom || recordDateTo) {
      where.recordDate = {}
      if (recordDateFrom) (where.recordDate as Record<string, unknown>).gte = new Date(recordDateFrom)
      if (recordDateTo) (where.recordDate as Record<string, unknown>).lte = new Date(recordDateTo)
    }

    const records = await prisma.workHourRecord.findMany({
      where,
      include: {
        ship: { select: { name: true } },
        team: { select: { name: true } },
        entries: {
          include: { timeSlots: { orderBy: { startTime: "asc" } } },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { recordDate: "desc" },
    })

    const rows = records.flatMap((record) =>
      record.entries.flatMap((entry) => {
        const timeRangeText = entry.timeSlots
          .map((slot) => `${formatHHMM(slot.startTime)}-${formatHHMM(slot.endTime)}`)
          .join("，")
        const totalHours = entry.timeSlots.reduce((sum, slot) => sum + calcHours(slot.startTime, slot.endTime), 0)

        return entry.timeSlots.map((slot) => ({
          日期: formatDate(record.recordDate),
          船名: record.ship.name,
          施工队伍: record.team.name,
          工种: entry.craftType,
          人数: entry.workerCount,
          时间段: timeRangeText,
          开始时间: formatHHMM(slot.startTime),
          结束时间: formatHHMM(slot.endTime),
          单段工时: slot.hours,
          工种总工时: Math.round(totalHours * entry.workerCount * 100) / 100,
          计工数: entry.workDays,
          备注: record.note || "",
        }))
      })
    )

    const ws = XLSX.utils.json_to_sheet(rows)
    ws["!cols"] = [
      { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 10 },
      { wch: 8 }, { wch: 24 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 16 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "工时明细")

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    const filename = `每日工时表_${formatDate(new Date()).replace(/\//g, "-")}.xlsx`

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("WorkHours export error:", err)
    return error("INTERNAL_ERROR", "导出 Excel 失败", 500)
  }
}
