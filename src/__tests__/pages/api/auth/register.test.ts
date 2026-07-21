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
import registerHandler from '@/pages/api/auth/register'

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

function mockInsertReturning(rows: unknown[]) {
  const returning = jest.fn().mockResolvedValue(rows)
  const values = jest.fn().mockReturnValue({ returning })
  ;(db.insert as jest.Mock).mockReturnValue({ values })
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 201 and set session cookie on valid registration', async () => {
    mockSelectReturning([])
    mockInsertReturning([{ id: 'host-1', name: 'John', email: 'john@test.com', passwordHash: 'hashed' }])
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password')

    const req = createMockReq('POST', { name: 'John', email: 'john@test.com', password: 'password123' })
    const res = createMockRes()

    await registerHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      host: { id: 'host-1', name: 'John', email: 'john@test.com' },
    })
    expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('host_session=host-1'))
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
  })

  it('should return 400 when name is missing', async () => {
    const req = createMockReq('POST', { email: 'john@test.com', password: 'password123' })
    const res = createMockRes()

    await registerHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Name is required' })
  })

  it('should return 400 when name is empty string', async () => {
    const req = createMockReq('POST', { name: '  ', email: 'john@test.com', password: 'password123' })
    const res = createMockRes()

    await registerHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Name is required' })
  })

  it('should return 400 when email is missing', async () => {
    const req = createMockReq('POST', { name: 'John', password: 'password123' })
    const res = createMockRes()

    await registerHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Valid email is required' })
  })

  it('should return 400 when email is invalid format', async () => {
    const req = createMockReq('POST', { name: 'John', email: 'invalid-email', password: 'password123' })
    const res = createMockRes()

    await registerHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Valid email is required' })
  })

  it('should return 400 when password is missing', async () => {
    const req = createMockReq('POST', { name: 'John', email: 'john@test.com' })
    const res = createMockRes()

    await registerHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Password must be at least 6 characters' })
  })

  it('should return 400 when password is less than 6 characters', async () => {
    const req = createMockReq('POST', { name: 'John', email: 'john@test.com', password: '12345' })
    const res = createMockRes()

    await registerHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Password must be at least 6 characters' })
  })

  it('should return 409 when email already exists', async () => {
    mockSelectReturning([{ id: 'existing-host', name: 'Existing', email: 'john@test.com' }])

    const req = createMockReq('POST', { name: 'John', email: 'john@test.com', password: 'password123' })
    const res = createMockRes()

    await registerHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'Email already registered' })
  })

  it('should not include passwordHash in the response', async () => {
    mockSelectReturning([])
    mockInsertReturning([{ id: 'host-1', name: 'John', email: 'john@test.com', passwordHash: 'hashed' }])
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password')

    const req = createMockReq('POST', { name: 'John', email: 'john@test.com', password: 'password123' })
    const res = createMockRes()

    await registerHandler(req, res)

    const responseCall = (res.json as jest.Mock).mock.calls[0][0]
    expect(responseCall.host.passwordHash).toBeUndefined()
  })

  it('should return 405 for non-POST methods', async () => {
    const req = createMockReq('GET', {})
    const res = createMockRes()

    await registerHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  it('should return 500 on database error', async () => {
    mockSelectThrowing(new Error('DB error'))

    const req = createMockReq('POST', { name: 'John', email: 'john@test.com', password: 'password123' })
    const res = createMockRes()

    await registerHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
  })

  it('should handle missing body gracefully', async () => {
    const req = { method: 'POST', body: undefined, cookies: {}, query: {}, headers: {} } as unknown as NextApiRequest
    const res = createMockRes()

    await registerHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})
