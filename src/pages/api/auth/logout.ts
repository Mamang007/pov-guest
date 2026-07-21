import type { NextApiRequest, NextApiResponse } from 'next'
import { clearSessionCookie } from '@/lib/auth'

type Data = {
  message?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  clearSessionCookie(res)

  return res.status(200).json({ message: 'Logged out successfully' })
}
