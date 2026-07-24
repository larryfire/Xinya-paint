import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate, authorize } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { createWorkHourRecordSchema } from "@/lib/validations"
import { getWorkHourFilter, getLeaderShipIds, getSupervisorShipIds } from "@/lib/permissions"
import { calcHours, calcWorkDays } from "@/lib/utils"
import { WORK_HOURS_PER_DAY } from "@/lib/constants"

/** 查询详情 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "work_hour:read")
    const { id } = await params
    const recordId = parseInt(id)
    if (isNaN(recordId)) return error("VALIDATION_ERROR", "ID 格式错误")

    const baseWhere = await getWorkHourFilter(auth.role, auth.userId, auth.teamId)
    const record = await prisma.workHourRecord.findFirst({
      where: { ...baseWhere, id: recordId },
      include: {
        ship: { select: { name: true } },
        team: { select: { name: true } },
        creator: { select: { realName: true } },
        entries: {
          include: { timeSlots: { orderBy: { startTime: "asc" } } },
          orderBy: { id: "asc" },
        },
      },
    })

    if (!record) return error("NOT_FOUND", "记录不存在", 404)

    const data = {
      id: record.id,
      recordDate: record.recordDate.toISOString().split("T")[0],
      shipId: record.shipId,
      shipName: record.ship.name,
      teamId: record.teamId,
      teamName: record.team.name,
      note: record.note,
      createdBy: record.createdBy,
      createdByName: record.creator.realName,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      entries: record.entries.map((entry) => ({
        id: entry.id,
        workHourRecordId: entry.workHourRecordId,
        craftType: entry.craftType,
        workerCount: entry.workerCount,
        workDays: entry.workDays,
        timeSlots: entry.timeSlots.map((slot) => ({
          id: slot.id,
          workHourEntryId: slot.workHourEntryId,
          startTime: new Date(slot.startTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
          endTime: new Date(slot.endTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
          hours: slot.hours,
        })),
      })),
    }

    return success(data)
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("WorkHours detail GET error:", err)
    return error("INTERNAL_ERROR", "获取记录详情失败", 500)
  }
}

/** 更新记录（整体替换工种和时间段） */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "work_hour:write")
    const { id } = await params
    const recordId = parseInt(id)
    if (isNaN(recordId)) return error("VALIDATION_ERROR", "ID 格式错误")

    const body = await request.json()
    const parsed = createWorkHourRecordSchema.safeParse(body)
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0].message)

    const { recordDate, shipId, teamId, note, entries } = parsed.data

    const baseWhere = await getWorkHourFilter(auth.role, auth.userId, auth.teamId)
    const existing = await prisma.workHourRecord.findFirst({
      where: { ...baseWhere, id: recordId },
    })
    if (!existing) return error("NOT_FOUND", "记录不存在", 404)

    // leader 只能修改本队伍记录
    if (auth.role === "leader") {
      if (auth.teamId !== teamId) {
        return error("FORBIDDEN", "只能修改本队伍工时记录", 403)
      }
      const leaderShips = await getLeaderShipIds(auth.teamId!)
      if (!leaderShips.includes(shipId)) {
        return error("FORBIDDEN", "该船舶未分配给你管理的队伍", 403)
      }
    }

    // supervisor 只能修改自己管理船舶的工时
    if (auth.role === "supervisor") {
      const supervisorShips = await getSupervisorShipIds(auth.userId)
      if (!supervisorShips.includes(shipId)) {
        return error("FORBIDDEN", "只能修改自己管理船舶的工时", 403)
      }
    }

    // 检查更新后是否会与已有记录冲突（排除自身）
    const duplicate = await prisma.workHourRecord.findFirst({
      where: {
        id: { not: recordId },
        recordDate: new Date(recordDate),
        shipId,
        teamId,
      },
    })
    if (duplicate) return error("CONFLICT", "该日期、船舶、队伍组合已存在其他记录")

    const updated = await prisma.$transaction(async (tx) => {
      // 删除旧工种明细（级联删除时间段）
      await tx.workHourEntry.deleteMany({ where: { workHourRecordId: recordId } })

      // 更新主记录并重新创建明细
      return tx.workHourRecord.update({
        where: { id: recordId },
        data: {
          recordDate: new Date(recordDate),
          shipId,
          teamId,
          note: note || "",
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
        },
        include: {
          ship: { select: { name: true } },
          team: { select: { name: true } },
          entries: { include: { timeSlots: true } },
        },
      })
    })

    return success(updated, "更新成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("WorkHours PUT error:", err)
    return error("INTERNAL_ERROR", "更新每日工时记录失败", 500)
  }
}

/** 删除记录 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(request)
    authorize(auth, "work_hour:write")
    const { id } = await params
    const recordId = parseInt(id)
    if (isNaN(recordId)) return error("VALIDATION_ERROR", "ID 格式错误")

    const baseWhere = await getWorkHourFilter(auth.role, auth.userId, auth.teamId)
    const existing = await prisma.workHourRecord.findFirst({
      where: { ...baseWhere, id: recordId },
    })
    if (!existing) return error("NOT_FOUND", "记录不存在", 404)

    await prisma.workHourRecord.delete({ where: { id: recordId } })
    return success(null, "删除成功")
  } catch (err) {
    if (err instanceof Error && (err.name === "UnauthorizedError" || err.name === "ForbiddenError")) {
      return error(err.name === "UnauthorizedError" ? "UNAUTHORIZED" : "FORBIDDEN", err.message, err.name === "UnauthorizedError" ? 401 : 403)
    }
    console.error("WorkHours DELETE error:", err)
    return error("INTERNAL_ERROR", "删除每日工时记录失败", 500)
  }
}
