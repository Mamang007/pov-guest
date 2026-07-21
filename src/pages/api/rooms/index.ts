import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { rooms } from '@/db/schema'
import { getHostIdFromRequest } from '@/lib/auth'
import { randomBytes } from 'crypto'

type Data = {
  room?: { id: string; hostId: string; name: string; code: string; presetFilter: string; createdAt: string }
  error?: string
}

const VALID_FILTERS = ['none', 'retro', 'classic-mono', 'warm-film', 'cyan-drift']

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}

function generateRoomCode(name: string): string {
  const slug = slugify(name) || 'room'
  const suffix = randomBytes(2).toString('hex')
  return `${slug}-${suffix}`
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const hostId = getHostIdFromRequest(req)
  if (!hostId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { name, presetFilter } = req.body ?? {}

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Room name is required' })
  }

  const filter = presetFilter || 'none'
  if (!VALID_FILTERS.includes(filter)) {
    return res.status(400).json({ error: 'Invalid filter preset' })
  }

  const code = generateRoomCode(name)

  try {
    const [newRoom] = await db
      .insert(rooms)
      .values({ hostId, name, code, presetFilter: filter })
      .returning()

    return res.status(201).json({
      room: {
        id: newRoom.id,
        hostId: newRoom.hostId,
        name: newRoom.name,
        code: newRoom.code,
        presetFilter: newRoom.presetFilter,
        createdAt: newRoom.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Room creation error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
