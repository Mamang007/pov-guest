jest.mock('@/db', () => ({
  db: {
    insert: jest.fn(),
  },
}))

jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  mkdir: jest.fn(),
}))

jest.mock('@/lib/multipart', () => ({
  parseMultipartForm: jest.fn(),
}))

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { writeFile, mkdir } from 'fs/promises'
import { parseMultipartForm } from '@/lib/multipart'
import uploadHandler from '@/pages/api/photos/upload'

function createMockReq(method = 'POST') {
  return {
    method,
    body: {},
    cookies: {},
    query: {},
    headers: {},
    url: '/api/photos/upload',
  } as unknown as NextApiRequest
}

function createMockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse
}

function mockParseSuccess(overrides: Partial<{
  guestName: string | null
  filterApplied: string | null
  roomId: string | null
  file: { name: string; type: string; buffer: Buffer } | null
}> = {}) {
  const defaults = {
    guestName: 'Alice',
    filterApplied: 'retro',
    roomId: 'room-uuid-1',
    file: { name: 'photo.jpg', type: 'image/jpeg', buffer: Buffer.from('fake-image-data') },
  }
  ;(parseMultipartForm as jest.Mock).mockResolvedValue({ ...defaults, ...overrides })
}

function mockInsertReturning(rows: unknown[]) {
  const returning = jest.fn().mockResolvedValue(rows)
  const values = jest.fn().mockReturnValue({ returning })
  ;(db.insert as jest.Mock).mockReturnValue({ values })
}

describe('POST /api/photos/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(writeFile as jest.Mock).mockResolvedValue(undefined)
    ;(mkdir as jest.Mock).mockResolvedValue(undefined)
  })

  it('should return 201 and photo data on successful upload', async () => {
    mockParseSuccess()
    mockInsertReturning([{ id: 'photo-1', imageUrl: '/uploads/test-uuid.jpg', guestName: 'Alice', filterApplied: 'retro' }])

    const req = createMockReq('POST')
    const res = createMockRes()

    await uploadHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      photo: { id: 'photo-1', imageUrl: '/uploads/test-uuid.jpg', guestName: 'Alice', filterApplied: 'retro' },
    })
  })

  it('should create uploads directory and write file to disk', async () => {
    mockParseSuccess()
    mockInsertReturning([{ id: 'photo-1', imageUrl: '/uploads/test.jpg', guestName: 'Alice', filterApplied: 'retro' }])

    const req = createMockReq('POST')
    const res = createMockRes()

    await uploadHandler(req, res)

    expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('uploads'), { recursive: true })
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('uploads'), expect.any(Buffer))
  })

  it('should insert photo record into database with correct fields', async () => {
    mockParseSuccess()
    mockInsertReturning([{ id: 'photo-1', imageUrl: '/uploads/test.jpg', guestName: 'Alice', filterApplied: 'retro' }])

    const req = createMockReq('POST')
    const res = createMockRes()

    await uploadHandler(req, res)

    expect(db.insert).toHaveBeenCalled()
    const insertResult = (db.insert as jest.Mock).mock.results[0].value
    const insertedValues = insertResult.values.mock.calls[0][0]
    expect(insertedValues.roomId).toBe('room-uuid-1')
    expect(insertedValues.guestName).toBe('Alice')
    expect(insertedValues.filterApplied).toBe('retro')
    expect(insertedValues.imageUrl).toMatch(/^\/uploads\//)
  })

  it('should default filterApplied to "none" when not provided', async () => {
    mockParseSuccess({ filterApplied: null })
    mockInsertReturning([{ id: 'photo-2', imageUrl: '/uploads/test.jpg', guestName: 'Alice', filterApplied: 'none' }])

    const req = createMockReq('POST')
    const res = createMockRes()

    await uploadHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    const insertResult = (db.insert as jest.Mock).mock.results[0].value
    const insertedValues = insertResult.values.mock.calls[0][0]
    expect(insertedValues.filterApplied).toBe('none')
  })

  it('should return 400 when guestName is missing', async () => {
    mockParseSuccess({ guestName: null })

    const req = createMockReq('POST')
    const res = createMockRes()

    await uploadHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Guest name is required' })
  })

  it('should return 400 when guestName is empty string', async () => {
    mockParseSuccess({ guestName: '   ' })

    const req = createMockReq('POST')
    const res = createMockRes()

    await uploadHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Guest name is required' })
  })

  it('should return 400 when roomId is missing', async () => {
    mockParseSuccess({ roomId: null })

    const req = createMockReq('POST')
    const res = createMockRes()

    await uploadHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Room ID is required' })
  })

  it('should return 400 when image file is missing', async () => {
    mockParseSuccess({ file: null })

    const req = createMockReq('POST')
    const res = createMockRes()

    await uploadHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Image file is required' })
  })

  it('should return 400 when form data parsing fails', async () => {
    ;(parseMultipartForm as jest.Mock).mockRejectedValue(new Error('Parse error'))

    const req = createMockReq('POST')
    const res = createMockRes()

    await uploadHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid form data' })
  })

  it('should return 405 for non-POST methods', async () => {
    const req = createMockReq('GET')
    const res = createMockRes()

    await uploadHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    expect(parseMultipartForm).not.toHaveBeenCalled()
  })

  it('should return 500 on file save error', async () => {
    mockParseSuccess()
    ;(writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'))

    const req = createMockReq('POST')
    const res = createMockRes()

    await uploadHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to save file' })
  })

  it('should return 500 on database error', async () => {
    mockParseSuccess()
    const returning = jest.fn().mockRejectedValue(new Error('DB error'))
    const values = jest.fn().mockReturnValue({ returning })
    ;(db.insert as jest.Mock).mockReturnValue({ values })

    const req = createMockReq('POST')
    const res = createMockRes()

    await uploadHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
  })

  it('should generate a unique filename with original extension', async () => {
    mockParseSuccess({ file: { name: 'vacation.png', type: 'image/png', buffer: Buffer.from('png-data') } })
    mockInsertReturning([{ id: 'photo-1', imageUrl: '/uploads/test.png', guestName: 'Alice', filterApplied: 'retro' }])

    const req = createMockReq('POST')
    const res = createMockRes()

    await uploadHandler(req, res)

    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/),
      expect.any(Buffer),
    )
  })
})
