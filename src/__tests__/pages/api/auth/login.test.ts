jest.mock('@/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/db'
import bcrypt from 'bcryptjs'
import loginHandler from '@/pages/api/auth/login'

function createMockReq(method = 'POST', body: Record<string, unknown> = {}) {
  return { method, body, cookies: {}, query: {}, headers: {} } as unknown as NextApiRequest
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

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 200 and set session cookie on valid credentials', async () => {
    mockSelectReturning([{ id: 'host-1', name: 'John', email: 'john@test.com', passwordHash: 'hashed' }])
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

    const req = createMockReq('POST', { email: 'john@test.com', password: 'password123' })
    const res = createMockRes()

    await loginHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      host: { id: 'host-1', name: 'John', email: 'john@test.com' },
    })
    expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('host_session=host-1'))
    expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed')
  })

  it('should return 401 when email not found', async () => {
    mockSelectReturning([])

    const req = createMockReq('POST', { email: 'notfound@test.com', password: 'password123' })
    const res = createMockRes()

    await loginHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' })
  })

  it('should return 401 when password is wrong', async () => {
    mockSelectReturning([{ id: 'host-1', name: 'John', email: 'john@test.com', passwordHash: 'hashed' }])
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

    const req = createMockReq('POST', { email: 'john@test.com', password: 'wrongpassword' })
    const res = createMockRes()

    await loginHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' })
  })

  it('should return 400 when email is missing', async () => {
    const req = createMockReq('POST', { password: 'password123' })
    const res = createMockRes()

    await loginHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Valid email is required' })
  })

  it('should return 400 when email is invalid format', async () => {
    const req = createMockReq('POST', { email: 'invalid', password: 'password123' })
    const res = createMockRes()

    await loginHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Valid email is required' })
  })

  it('should return 400 when password is missing', async () => {
    const req = createMockReq('POST', { email: 'john@test.com' })
    const res = createMockRes()

    await loginHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Password is required' })
  })

  it('should not include passwordHash in the response', async () => {
    mockSelectReturning([{ id: 'host-1', name: 'John', email: 'john@test.com', passwordHash: 'hashed' }])
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

    const req = createMockReq('POST', { email: 'john@test.com', password: 'password123' })
    const res = createMockRes()

    await loginHandler(req, res)

    const responseCall = (res.json as jest.Mock).mock.calls[0][0]
    expect(responseCall.host.passwordHash).toBeUndefined()
  })

  it('should return 405 for non-POST methods', async () => {
    const req = createMockReq('GET', {})
    const res = createMockRes()

    await loginHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  it('should return 500 on database error', async () => {
    mockSelectThrowing(new Error('DB error'))

    const req = createMockReq('POST', { email: 'john@test.com', password: 'password123' })
    const res = createMockRes()

    await loginHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
  })

  it('should handle missing body gracefully', async () => {
    const req = { method: 'POST', body: undefined, cookies: {}, query: {}, headers: {} } as unknown as NextApiRequest
    const res = createMockRes()

    await loginHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})
