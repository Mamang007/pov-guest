import type { NextApiRequest, NextApiResponse } from 'next'

export const SESSION_COOKIE_NAME = 'host_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function setSessionCookie(res: NextApiResponse, hostId: string): void {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=${hostId}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE}; SameSite=Lax`)
}

export function clearSessionCookie(res: NextApiResponse): void {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`)
}

export function getHostIdFromRequest(req: NextApiRequest): string | null {
  const hostId = req.cookies[SESSION_COOKIE_NAME]
  return hostId || null
}
