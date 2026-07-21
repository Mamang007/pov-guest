import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import DashboardPage from '@/pages/dashboard'

const mockPush = jest.fn()

function renderPage() {
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  return render(<DashboardPage />)
}

const mockRooms = [
  { id: 'room-1', name: 'John & Jane Wedding', code: 'john-jane-001', presetFilter: 'retro', createdAt: '2026-07-20T10:00:00Z' },
  { id: 'room-2', name: 'Birthday Bash', code: 'birthday-002', presetFilter: 'classic-mono', createdAt: '2026-07-19T10:00:00Z' },
]

describe('Dashboard Page', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    originalFetch = global.fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  function mockFetchRooms(rooms: unknown[] = mockRooms) {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ rooms }),
    })
  }

  it('should show loading state initially', () => {
    ;(global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should fetch and display rooms on mount', async () => {
    mockFetchRooms()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('John & Jane Wedding')).toBeInTheDocument()
    })
    expect(screen.getByText('Birthday Bash')).toBeInTheDocument()
  })

  it('should call GET /api/hosts/rooms on mount', async () => {
    mockFetchRooms()
    renderPage()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/hosts/rooms', expect.any(Object))
    })
  })

  it('should redirect to login when unauthorized (401)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    })
    renderPage()

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('should render create room form with name input', async () => {
    mockFetchRooms()
    renderPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/room name/i)).toBeInTheDocument()
    })
  })

  it('should render filter preset picker with four options', async () => {
    mockFetchRooms()
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^retro$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /classic.?mono/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /warm.?film/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cyan.?drift/i })).toBeInTheDocument()
    })
  })

  it('should show validation error when creating room without name', async () => {
    mockFetchRooms()
    renderPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/room name/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /create room/i }))

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should create room and refresh list on valid submit', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ rooms: mockRooms }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'room-3', name: 'New Event', code: 'new-003', presetFilter: 'cyan-drift', createdAt: '2026-07-21T10:00:00Z' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ rooms: [...mockRooms, { id: 'room-3', name: 'New Event', code: 'new-003', presetFilter: 'cyan-drift' }] }) })

    renderPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/room name/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/room name/i), { target: { value: 'New Event' } })
    fireEvent.click(screen.getByRole('button', { name: /cyan.?drift/i }))
    fireEvent.click(screen.getByRole('button', { name: /create room/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/rooms', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Event', presetFilter: 'cyan-drift' }),
      }))
    })
  })

  it('should display error when creating room fails', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ rooms: mockRooms }) })
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'Room name already exists' }) })

    renderPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/room name/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/room name/i), { target: { value: 'Duplicate' } })
    fireEvent.click(screen.getByRole('button', { name: /create room/i }))

    await waitFor(() => {
      expect(screen.getByText(/room name already exists/i)).toBeInTheDocument()
    })
  })

  it('should display QR code image for each room', async () => {
    mockFetchRooms()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('John & Jane Wedding')).toBeInTheDocument()
    })

    const qrImages = screen.getAllByAltText(/qr code/i)
    expect(qrImages.length).toBe(2)
    expect(qrImages[0].getAttribute('src')).toContain('qrserver.com')
    expect(qrImages[0].getAttribute('src')).toContain('john-jane-001')
  })

  it('should display filter preset badge for each room', async () => {
    mockFetchRooms()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('John & Jane Wedding')).toBeInTheDocument()
    })

    expect(screen.getAllByText(/retro/i).length).toBeGreaterThanOrEqual(1)
  })

  it('should display room code for each room', async () => {
    mockFetchRooms()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/john-jane-001/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/birthday-002/i)).toBeInTheDocument()
  })

  it('should show empty state when no rooms exist', async () => {
    mockFetchRooms([])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/no rooms yet/i)).toBeInTheDocument()
    })
  })

  it('should show error when fetching rooms fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/failed to load|error/i)).toBeInTheDocument()
    })
  })

  it('should have a logout button', async () => {
    mockFetchRooms()
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /logout|log out|sign out/i })).toBeInTheDocument()
    })
  })

  it('should call logout API and redirect on logout', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ rooms: mockRooms }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ message: 'Logged out' }) })

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /logout|log out|sign out/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /logout|log out|sign out/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})
