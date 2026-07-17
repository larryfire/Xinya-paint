import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ success: true, message: "已退出" })
  response.cookies.set("token", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  })
  return response
}
