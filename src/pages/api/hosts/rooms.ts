import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { rooms } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { desc } from 'drizzle-orm'
import { getHostIdFromRequest } from '@/lib/auth'

type Data = {
  rooms?: Array<{ id: string; hostId: string; name: string; code: string; presetFilter: string; createdAt: string }>
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const hostId = getHostIdFromRequest(req)
  if (!hostId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const result = await db
      .select()
      .from(rooms)
      .where(eq(rooms.hostId, hostId))
      .orderBy(desc(rooms.createdAt))

    return res.status(200).json({
      rooms: result.map((room) => ({
        id: room.id,
        hostId: room.hostId,
        name: room.name,
        code: room.code,
        presetFilter: room.presetFilter,
        createdAt: room.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Rooms fetch error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
