import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { photos } from '@/db/schema'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { parseMultipartForm } from '@/lib/multipart'

type Data = {
  photo?: { id: string; imageUrl: string; guestName: string; filterApplied: string }
  error?: string
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let parsed
  try {
    parsed = await parseMultipartForm(req)
  } catch {
    return res.status(400).json({ error: 'Invalid form data' })
  }

  const { guestName, filterApplied, roomId, file } = parsed

  if (!guestName || typeof guestName !== 'string' || guestName.trim().length === 0) {
    return res.status(400).json({ error: 'Guest name is required' })
  }
  if (!roomId || typeof roomId !== 'string') {
    return res.status(400).json({ error: 'Room ID is required' })
  }
  if (!file) {
    return res.status(400).json({ error: 'Image file is required' })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${randomUUID()}.${ext}`
  const uploadDir = process.env.UPLOAD_DIR || '/var/data/pov-guest/uploads'

  try {
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), file.buffer)
  } catch (error) {
    console.error('File save error:', error)
    return res.status(500).json({ error: 'Failed to save file' })
  }

  const imageUrl = `/api/uploads/${filename}`

  try {
    const [photo] = await db
      .insert(photos)
      .values({
        roomId,
        guestName,
        filterApplied: filterApplied || 'none',
        imageUrl,
      })
      .returning()

    return res.status(201).json({
      photo: { id: photo.id, imageUrl: photo.imageUrl, guestName: photo.guestName, filterApplied: photo.filterApplied },
    })
  } catch (error) {
    console.error('Database error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
