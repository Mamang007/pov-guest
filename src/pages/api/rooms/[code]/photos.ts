import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { photos, rooms } from '@/db/schema'
import { eq } from 'drizzle-orm'

type Data = {
  photos?: Array<{
    id: string
    roomId: string
    guestName: string
    imageUrl: string
    filterApplied: string
    createdAt: string
  }>
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
    // Look up room by code
    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.code, code))
      .limit(1)

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Fetch all photos for this room
    const roomPhotos = await db
      .select()
      .from(photos)
      .where(eq(photos.roomId, room.id))

    const sorted = roomPhotos
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((p) => ({
        id: p.id,
        roomId: p.roomId,
        guestName: p.guestName,
        imageUrl: p.imageUrl,
        filterApplied: p.filterApplied,
        createdAt: p.createdAt.toISOString(),
      }))

    return res.status(200).json({ photos: sorted })
  } catch (error) {
    console.error('Photos fetch error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
