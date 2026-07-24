import type { NextApiRequest, NextApiResponse } from 'next'
import { createReadStream, existsSync, statSync } from 'fs'
import { join, extname } from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/var/data/pov-guest/uploads'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  const { filename } = req.query

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename required' })
  }

  // Prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' })
  }

  const filePath = join(UPLOAD_DIR, filename)

  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'Not found' })
  }

  const stat = statSync(filePath)
  const ext = extname(filename).toLowerCase()
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream'

  res.setHeader('Content-Type', mimeType)
  res.setHeader('Content-Length', stat.size)
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')

  const stream = createReadStream(filePath)
  stream.pipe(res)
}
