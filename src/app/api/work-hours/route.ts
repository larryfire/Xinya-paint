import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error, paginated, getPaginationParams } from "@/lib/api-response"
import { createWorkHourRecordSchema } from "@/lib/validations"
import { getWorkHourFilter, getLeaderShipIds, getSupervisorShipIds } from "@/lib/permissions"
import { calcHours, calcWorkDays } from "@/lib/utils"
import { WORK_HOURS_PER_DAY } from "@/lib/constants"

/** 工时记录列表查询 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "work_hour:read")

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = getPaginationParams(searchParams)
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

    const [items, total] = await Promise.all([
      prisma.workHourRecord.findMany({
        where,
        include: {
          ship: { select: { name: true } },
          team: { select: { name: true } },
          creator: { select: { realName: true } },
          entries: {
            include: { timeSlots: { orderBy: { startTime: "asc" } } },
            orderBy: { id: "asc" },
          },
        },
        skip,
        take: pageSize,
        orderBy: { recordDate: "desc" },
      }),
      prisma.workHourRecord.count({ where }),
    ])

    const data = items.map((record) => {
      const entries = record.entries.map((entry) => {
        const totalHours = entry.timeSlots.reduce((sum, slot) => sum + calcHours(slot.startTime, slot.endTime), 0)
        return {
          id: entry.id,
          workHourRecordId: entry.workHourRecordId,
          craftType: entry.craftType,
          workerCount: entry.workerCount,
          workDays: entry.workDays,
          totalHours: Math.round(totalHours * 100) / 100,
          createdAt: entry.createdAt.toISOString(),
          timeSlots: entry.timeSlots.map((slot) => ({
            id: slot.id,
            workHourEntryId: slot.workHourEntryId,
            startTime: slot.startTime.toISOString(),
            endTime: slot.endTime.toISOString(),
            hours: slot.hours,
            createdAt: slot.createdAt.toISOString(),
          })),
        }
      })

      const totalWorkers = entries.reduce((sum, e) => sum + e.workerCount, 0)
      const totalWorkDays = entries.reduce((sum, e) => sum + e.workDays, 0)

      return {
        id: record.id,
        recordDate: record.recordDate.toISOString(),
        shipId: record.shipId,
        shipName: record.ship.name,
        teamId: record.teamId,
        teamName: record.team.name,
        note: record.note,
        createdBy: record.createdBy,
        createdByName: record.creator.realName,
        totalWorkers,
        totalWorkDays: Math.round(totalWorkDays * 100) / 100,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        entries,
      }
    })

    return paginated(data, total, page, pageSize)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("WorkHours GET error:", err)
    return error("INTERNAL_ERROR", "获取每日工时记录失败", 500)
  }
}

/** 创建每日工时记录 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "work_hour:write")

    const body = await request.json()
    const parsed = createWorkHourRecordSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const { recordDate, shipId, teamId, note, entries } = parsed.data

    // leader 只能录入本队伍 + 被分配到的船舶
    if (auth.role === "leader") {
      if (auth.teamId !== teamId) {
        return error("FORBIDDEN", "只能录入本队伍工时记录", 403)
      }
      const leaderShips = await getLeaderShipIds(auth.teamId!)
      if (!leaderShips.includes(shipId)) {
        return error("FORBIDDEN", "该船舶未分配给你管理的队伍", 403)
      }
    }

    // supervisor 只能录入自己管理船舶的工时
    if (auth.role === "supervisor") {
      const supervisorShips = await getSupervisorShipIds(auth.userId)
      if (!supervisorShips.includes(shipId)) {
        return error("FORBIDDEN", "只能录入自己管理船舶的工时", 403)
      }
    }

    // 同一日期+船+队伍已存在则禁止重复
    const existing = await prisma.workHourRecord.findFirst({
      where: { recordDate: new Date(recordDate), shipId, teamId },
    })
    if (existing) return error("CONFLICT", "该日期、船舶、队伍组合已存在记录")

    const data = buildRecordCreateData(recordDate, shipId, teamId, note || "", entries, auth.userId)
    const record = await prisma.workHourRecord.create({
      data,
      include: {
        ship: { select: { name: true } },
        team: { select: { name: true } },
        entries: { include: { timeSlots: true } },
      },
    })

    return success(record, "创建成功", 201)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("WorkHours POST error:", err)
    return error("INTERNAL_ERROR", "创建每日工时记录失败", 500)
  }
}

/** 构建嵌套创建数据 */
function buildRecordCreateData(
  recordDate: string,
  shipId: number,
  teamId: number,
  note: string,
  entries: Array<{
    craftType: string
    workerCount: number
    timeSlots: Array<{ startTime: string; endTime: string }>
  }>,
  createdBy: number
) {
  return {
    recordDate: new Date(recordDate),
    shipId,
    teamId,
    note,
    createdBy,
    entries: {
      create: entries.map((entry) => {
        const totalHours = entry.timeSlots.reduce((sum, slot) => {
          return sum + calcHours(`${recordDate}T${slot.startTime}:00`, `${recordDate}T${slot.endTime}:00`)
        }, 0)
        const workDays = calcWorkDays(totalHours * entry.workerCount, WORK_HOURS_PER_DAY)

        return {
          craftType: entry.craftType,
          workerCount: entry.workerCount,
          workDays,
          timeSlots: {
            create: entry.timeSlots.map((slot) => {
              const startTime = new Date(`${recordDate}T${slot.startTime}:00`)
              const endTime = new Date(`${recordDate}T${slot.endTime}:00`)
              return {
                startTime,
                endTime,
                hours: calcHours(startTime, endTime),
              }
            }),
          },
        }
      }),
    },
  }
}
