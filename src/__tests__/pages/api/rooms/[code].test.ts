jest.mock('@/db', () => ({
  db: {
    select: jest.fn(),
  },
}))

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import roomHandler from '@/pages/api/rooms/[code]'

function createMockReq(method = 'GET', code = 'john-jane-001') {
  return { method, body: {}, cookies: {}, query: { code }, headers: {} } as unknown as NextApiRequest
}

function createMockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse
}

function mockSelectReturning(rows: unknown[]) {
  const limit = jest.fn().mockResolvedValue(rows)
  const where = jest.fn().mockReturnValue({ limit })
  const from = jest.fn().mockReturnValue({ where })
  ;(db.select as jest.Mock).mockReturnValue({ from })
}

function mockSelectThrowing(error: Error) {
  const limit = jest.fn().mockRejectedValue(error)
  const where = jest.fn().mockReturnValue({ limit })
  const from = jest.fn().mockReturnValue({ where })
  ;(db.select as jest.Mock).mockReturnValue({ from })
}

describe('GET /api/rooms/[code]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 200 and room details for valid code', async () => {
    mockSelectReturning([{ id: 'room-1', hostId: 'host-1', name: 'John & Jane Wedding', code: 'john-jane-001', presetFilter: 'retro', createdAt: new Date('2026-07-20T10:00:00Z') }])

    const req = createMockReq('GET', 'john-jane-001')
    const res = createMockRes()

    await roomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      id: 'room-1',
      hostId: 'host-1',
      name: 'John & Jane Wedding',
      code: 'john-jane-001',
      presetFilter: 'retro',
      createdAt: expect.any(String),
    })
  })

  it('should return 404 when room is not found', async () => {
    mockSelectReturning([])

    const req = createMockReq('GET', 'nonexistent-code')
    const res = createMockRes()

    await roomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Room not found' })
  })

  it('should return 400 when code is missing', async () => {
    const req = { method: 'GET', body: {}, cookies: {}, query: {}, headers: {} } as unknown as NextApiRequest
    const res = createMockRes()

    await roomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Room code is required' })
  })

  it('should return 405 for non-GET methods', async () => {
    const req = createMockReq('POST', 'john-jane-001')
    const res = createMockRes()

    await roomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    expect(db.select).not.toHaveBeenCalled()
  })

  it('should return 500 on database error', async () => {
    mockSelectThrowing(new Error('DB error'))

    const req = createMockReq('GET', 'john-jane-001')
    const res = createMockRes()

    await roomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
  })

  it('should not require authentication (public route)', async () => {
    mockSelectReturning([{ id: 'room-1', hostId: 'host-1', name: 'Test Room', code: 'test-001', presetFilter: 'none', createdAt: new Date('2026-07-20T10:00:00Z') }])

    const req = { method: 'GET', body: {}, cookies: {}, query: { code: 'test-001' }, headers: {} } as unknown as NextApiRequest
    const res = createMockRes()

    await roomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
  })
})
