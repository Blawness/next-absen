import { NextRequest, NextResponse } from "next/server"
import { withErrorHandling } from "@/lib/errors"
import { parseBody } from "@/lib/validation"
import { requireSameOrigin } from "@/lib/csrf"
import {
  attendanceCreateSchema,
  attendanceUpdateSchema,
  attendanceDeleteSchema,
} from "@/lib/validation"
import {
  listAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getUsers,
} from "./services"

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)

  if (searchParams.get("users") === "true") {
    const users = await getUsers()
    return NextResponse.json(users)
  }

  const userId = searchParams.get("userId") ?? undefined
  const dateFrom = searchParams.get("dateFrom") ?? undefined
  const dateTo = searchParams.get("dateTo") ?? undefined
  const status = searchParams.get("status") ?? undefined
  const page = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = parseInt(searchParams.get("limit") ?? "20", 10)

  const result = await listAttendance({ userId, dateFrom, dateTo, status, page, limit })
  return NextResponse.json(result)
}, "fetching attendance records")

export const POST = withErrorHandling(async (request: NextRequest) => {
  const csrf = requireSameOrigin(request)
  if (csrf) return csrf

  const body = await parseBody(request, attendanceCreateSchema)
  const record = await createAttendance(body)
  return NextResponse.json(record, { status: 201 })
}, "creating attendance record")

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const csrf = requireSameOrigin(request)
  if (csrf) return csrf

  const body = await parseBody(request, attendanceUpdateSchema)
  const record = await updateAttendance(body)
  return NextResponse.json(record)
}, "updating attendance record")

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const csrf = requireSameOrigin(request)
  if (csrf) return csrf

  const body = await parseBody(request, attendanceDeleteSchema)
  const result = await deleteAttendance(body.id)
  return NextResponse.json(result)
}, "deleting attendance record")
