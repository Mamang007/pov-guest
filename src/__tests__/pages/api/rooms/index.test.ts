jest.mock('@/db', () => ({
  db: {
    insert: jest.fn(),
  },
}))

jest.mock('@/lib/auth', () => ({
  getHostIdFromRequest: jest.fn(),
}))

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import { getHostIdFromRequest } from '@/lib/auth'
import createRoomHandler from '@/pages/api/rooms/index'

function createMockReq(method = 'POST', body: Record<string, unknown> = {}, cookies: Record<string, string | undefined> = {}) {
  return { method, body, cookies, query: {}, headers: {} } as unknown as NextApiRequest
}

function createMockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse
}

function mockInsertReturning(rows: unknown[]) {
  const returning = jest.fn().mockResolvedValue(rows)
  const values = jest.fn().mockReturnValue({ returning })
  ;(db.insert as jest.Mock).mockReturnValue({ values })
}

describe('POST /api/rooms', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 201 and room details on valid creation', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue('host-1')
    mockInsertReturning([{ id: 'room-1', hostId: 'host-1', name: 'John & Jane Wedding', code: 'john-jane-a1b2', presetFilter: 'retro', createdAt: new Date('2026-07-20T10:00:00Z') }])

    const req = createMockReq('POST', { name: 'John & Jane Wedding', presetFilter: 'retro' }, { host_session: 'host-1' })
    const res = createMockRes()

    await createRoomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      room: { id: 'room-1', hostId: 'host-1', name: 'John & Jane Wedding', code: 'john-jane-a1b2', presetFilter: 'retro', createdAt: expect.any(String) },
    })
  })

  it('should default presetFilter to "none" when not provided', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue('host-1')
    mockInsertReturning([{ id: 'room-2', hostId: 'host-1', name: 'Birthday', code: 'birthday-c3d4', presetFilter: 'none', createdAt: new Date('2026-07-20T10:00:00Z') }])

    const req = createMockReq('POST', { name: 'Birthday' }, { host_session: 'host-1' })
    const res = createMockRes()

    await createRoomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    const insertValues = (db.insert as jest.Mock).mock.results[0].value.values.mock.calls[0][0]
    expect(insertValues.presetFilter).toBe('none')
  })

  it('should return 401 when host is not authenticated', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue(null)

    const req = createMockReq('POST', { name: 'Test Room' }, {})
    const res = createMockRes()

    await createRoomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('should return 400 when name is missing', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue('host-1')

    const req = createMockReq('POST', { presetFilter: 'retro' }, { host_session: 'host-1' })
    const res = createMockRes()

    await createRoomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Room name is required' })
  })

  it('should return 400 when name is empty string', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue('host-1')

    const req = createMockReq('POST', { name: '   ', presetFilter: 'retro' }, { host_session: 'host-1' })
    const res = createMockRes()

    await createRoomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Room name is required' })
  })

  it('should return 400 when presetFilter is invalid', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue('host-1')

    const req = createMockReq('POST', { name: 'Test Room', presetFilter: 'invalid-filter' }, { host_session: 'host-1' })
    const res = createMockRes()

    await createRoomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid filter preset' })
  })

  it('should accept all valid filter presets', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue('host-1')
    mockInsertReturning([{ id: 'room-1', hostId: 'host-1', name: 'Test', code: 'test-a1b2', presetFilter: 'cyan-drift', createdAt: new Date('2026-07-20T10:00:00Z') }])

    const validFilters = ['none', 'retro', 'classic-mono', 'warm-film', 'cyan-drift']

    for (const filter of validFilters) {
      jest.clearAllMocks()
      ;(getHostIdFromRequest as jest.Mock).mockReturnValue('host-1')
      mockInsertReturning([{ id: 'room-1', hostId: 'host-1', name: 'Test', code: 'test-a1b2', presetFilter: filter, createdAt: new Date('2026-07-20T10:00:00Z') }])

      const req = createMockReq('POST', { name: 'Test Room', presetFilter: filter }, { host_session: 'host-1' })
      const res = createMockRes()

      await createRoomHandler(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    }
  })

  it('should generate a unique room code', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue('host-1')
    mockInsertReturning([{ id: 'room-1', hostId: 'host-1', name: 'John & Jane Wedding', code: 'john-jane-a1b2', presetFilter: 'retro', createdAt: new Date('2026-07-20T10:00:00Z') }])

    const req = createMockReq('POST', { name: 'John & Jane Wedding', presetFilter: 'retro' }, { host_session: 'host-1' })
    const res = createMockRes()

    await createRoomHandler(req, res)

    const insertValues = (db.insert as jest.Mock).mock.results[0].value.values.mock.calls[0][0]
    expect(insertValues.code).toBeDefined()
    expect(typeof insertValues.code).toBe('string')
    expect(insertValues.code.length).toBeGreaterThan(0)
  })

  it('should return 405 for non-POST methods', async () => {
    const req = createMockReq('GET', {}, { host_session: 'host-1' })
    const res = createMockRes()

    await createRoomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  it('should return 500 on database error', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue('host-1')
    const returning = jest.fn().mockRejectedValue(new Error('DB error'))
    const values = jest.fn().mockReturnValue({ returning })
    ;(db.insert as jest.Mock).mockReturnValue({ values })

    const req = createMockReq('POST', { name: 'Test Room', presetFilter: 'retro' }, { host_session: 'host-1' })
    const res = createMockRes()

    await createRoomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
  })

  it('should handle missing body gracefully', async () => {
    ;(getHostIdFromRequest as jest.Mock).mockReturnValue('host-1')

    const req = { method: 'POST', body: undefined, cookies: { host_session: 'host-1' }, query: {}, headers: {} } as unknown as NextApiRequest
    const res = createMockRes()

    await createRoomHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Room name is required' })
  })
})
