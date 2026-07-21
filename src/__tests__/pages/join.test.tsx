import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import JoinPage from '@/pages/join/[code]'

const mockPush = jest.fn()

function renderPage(code = 'john-jane-001') {
  ;(useRouter as jest.Mock).mockReturnValue({
    query: { code },
    push: mockPush,
  })
  return render(<JoinPage />)
}

const mockRoom = {
  id: 'room-1',
  name: 'John & Jane Wedding',
  code: 'john-jane-001',
  presetFilter: 'retro',
  createdAt: '2026-07-20T10:00:00Z',
}

describe('Join Page (/join/[code])', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    originalFetch = global.fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('should show loading state initially', () => {
    ;(global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should fetch room details on mount', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRoom,
    })
    renderPage()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/rooms/john-jane-001', expect.any(Object))
    })
  })

  it('should display room name after fetching', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRoom,
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('John & Jane Wedding')).toBeInTheDocument()
    })
  })

  it('should display display name input', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRoom,
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/display name|your name|name/i)).toBeInTheDocument()
    })
  })

  it('should show validation error for empty name', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRoom,
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /enter|join|continue/i }))

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should redirect to room page on valid submit', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRoom,
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByRole('button', { name: /enter|join|continue/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({
        pathname: '/room/john-jane-001',
        query: { guest: 'Alice' },
      }))
    })
  })

  it('should show error when room not found', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Room not found' }),
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/room not found|does not exist/i)).toBeInTheDocument()
    })
  })

  it('should show the default filter preset', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRoom,
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/retro/i)).toBeInTheDocument()
    })
  })
})
