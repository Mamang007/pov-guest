import type { NextApiRequest, NextApiResponse } from 'next'
import logoutHandler from '@/pages/api/auth/logout'

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

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should clear session cookie and return 200', async () => {
    const req = createMockReq('POST', {})
    const res = createMockRes()

    await logoutHandler(req, res)

    expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('host_session='))
    expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('Max-Age=0'))
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' })
  })

  it('should return 405 for non-POST methods', async () => {
    const req = createMockReq('GET', {})
    const res = createMockRes()

    await logoutHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  it('should return 405 for PUT method', async () => {
    const req = createMockReq('PUT', {})
    const res = createMockRes()

    await logoutHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('should return 405 for DELETE method', async () => {
    const req = createMockReq('DELETE', {})
    const res = createMockRes()

    await logoutHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})
