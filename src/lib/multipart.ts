import { Readable } from 'stream'
import type { NextApiRequest } from 'next'

export interface ParsedFile {
  name: string
  type: string
  buffer: Buffer
}

export interface ParsedFormData {
  guestName: string | null
  filterApplied: string | null
  roomId: string | null
  file: ParsedFile | null
}

export async function parseMultipartForm(req: NextApiRequest): Promise<ParsedFormData> {
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'http'
  const host = req.headers.host || 'localhost'
  const url = `${protocol}://${host}${req.url || ''}`

  const stream = Readable.toWeb(req) as ReadableStream<Uint8Array>
  const request = new Request(url, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: stream,
    // @ts-expect-error duplex is required for streaming body
    duplex: 'half',
  })

  const formData = await request.formData()

  const guestName = formData.get('guestName')
  const filterApplied = formData.get('filterApplied')
  const roomId = formData.get('roomId')
  const file = formData.get('image')

  return {
    guestName: typeof guestName === 'string' ? guestName : null,
    filterApplied: typeof filterApplied === 'string' ? filterApplied : null,
    roomId: typeof roomId === 'string' ? roomId : null,
    file: file instanceof File ? {
      name: file.name,
      type: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    } : null,
  }
}
