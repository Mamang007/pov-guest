jest.mock('@/db', () => ({
  db: {
    select: jest.fn(),
  },
}))

jest.mock('@/lib/auth', () => ({
  getHostIdFromRequest: jest.fn(),
}))

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { getHostIdFromRequest } from '@/lib/auth'
import listRoomsHandler from '@/pages/api/hosts/rooms'

function createMockReq(method = 'GET', cookies: Record<string, string | undefined> = {}) {
  return { method, body: {}, cookies, query: {}, headers: {} } as unknown as NextApiRequest
}

function createMockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse
}

function mockSelectReturning(rows: unknown[]) {
  const orderBy = jest.fn().mockResolvedValue(rows)
  const where = jest.fn().mockReturnValue({ orderBy })
  const from = jest.fn().mockReturnValue({ where })
  ;(db.select as jest.Mock).mockReturnValue({ from })
}

function mockSelectThrowing(error: Error) {
  const orderBy = jest.fn().mockRejectedValue(error)
  const where = jest.fn().mockReturnValue({ orderBy })
  const from = jest.fn().mockReturnValue({ where })
  ;(db.select as jest.Mock).mockReturnValue({ from })
}

describe('GET /api/hosts/rooms', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 200 and list of rooms for authenticated host', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue('host-1')
    mockSelectReturning([
      { id: 'room-1', hostId: 'host-1', name: 'Wedding', code: 'wedding-001', presetFilter: 'retro', createdAt: new Date('2026-07-20T10:00:00Z') },
      { id: 'room-2', hostId: 'host-1', name: 'Birthday', code: 'birthday-002', presetFilter: 'classic-mono', createdAt: new Date('2026-07-19T10:00:00Z') },
    ])

    const req = createMockReq('GET', { host_session: 'host-1' })
    const res = createMockRes()

    await listRoomsHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      rooms: expect.arrayContaining([
        expect.objectContaining({ id: 'room-1', name: 'Wedding', code: 'wedding-001', presetFilter: 'retro' }),
        expect.objectContaining({ id: 'room-2', name: 'Birthday', code: 'birthday-002', presetFilter: 'classic-mono' }),
      ]),
    })
  })

  it('should return 200 with empty array when host has no rooms', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue('host-1')
    mockSelectReturning([])

    const req = createMockReq('GET', { host_session: 'host-1' })
    const res = createMockRes()

    await listRoomsHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ rooms: [] })
  })

  it('should return 401 when host is not authenticated', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue(null)

    const req = createMockReq('GET', {})
    const res = createMockRes()

    await listRoomsHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(db.select).not.toHaveBeenCalled()
  })

  it('should return 405 for non-GET methods', async () => {
    const req = createMockReq('POST', { host_session: 'host-1' })
    const res = createMockRes()

    await listRoomsHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  it('should return 500 on database error', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue('host-1')
    mockSelectThrowing(new Error('DB error'))

    const req = createMockReq('GET', { host_session: 'host-1' })
    const res = createMockRes()

    await listRoomsHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
  })
})
