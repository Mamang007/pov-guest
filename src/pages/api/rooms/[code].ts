import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { rooms } from '@/db/schema'
import { eq } from 'drizzle-orm'

type Data = {
  id?: string
  hostId?: string
  name?: string
  code?: string
  presetFilter?: string
  createdAt?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.query

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Room code is required' })
  }

  try {
    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.code, code))
      .limit(1)

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    return res.status(200).json({
      id: room.id,
      hostId: room.hostId,
      name: room.name,
      code: room.code,
      presetFilter: room.presetFilter,
      createdAt: room.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Room fetch error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
