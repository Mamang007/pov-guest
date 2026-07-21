import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { hosts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { isValidEmail, setSessionCookie } from '@/lib/auth'

type Data = {
  host?: { id: string; name: string; email: string }
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body ?? {}

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Valid email is required' })
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' })
  }

  try {
    const [host] = await db.select().from(hosts).where(eq(hosts.email, email)).limit(1)

    if (!host) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isValid = await bcrypt.compare(password, host.passwordHash)
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    setSessionCookie(res, host.id)

    return res.status(200).json({
      host: { id: host.id, name: host.name, email: host.email },
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
