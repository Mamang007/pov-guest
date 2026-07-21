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

  const { name, email, password } = req.body ?? {}

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' })
  }
  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Valid email is required' })
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    const existing = await db.select().from(hosts).where(eq(hosts.email, email)).limit(1)
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const [newHost] = await db
      .insert(hosts)
      .values({ name, email, passwordHash })
      .returning()

    setSessionCookie(res, newHost.id)

    return res.status(201).json({
      host: { id: newHost.id, name: newHost.name, email: newHost.email },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
