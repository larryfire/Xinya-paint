import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "xinya-paint-default-secret-change-in-production"
)

const JWT_EXPIRES_IN = "24h"

export interface JwtPayload {
  userId: number
  username: string
  role: string
  teamId: number | null
}

/** 签发 JWT Token */
export async function signJWT(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET)
}

/** 验证 JWT Token */
export async function verifyJWT(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload as unknown as JwtPayload
}
