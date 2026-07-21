import { render, screen, waitFor, act } from '@testing-library/react'
import { useRouter } from 'next/router'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import AlbumPage from '@/pages/album/[code]'

const mockPush = jest.fn()

const mockRoom = {
  id: 'room-1',
  name: 'John & Jane Wedding',
  code: 'john-jane-001',
  presetFilter: 'retro',
  createdAt: '2026-07-20T10:00:00Z',
}

const mockPhotos = [
  { id: 'p1', roomId: 'room-1', guestName: 'Alice', imageUrl: '/uploads/photo1.jpg', filterApplied: 'retro', createdAt: '2026-07-21T10:00:00Z' },
  { id: 'p2', roomId: 'room-1', guestName: 'Bob', imageUrl: '/uploads/photo2.jpg', filterApplied: 'classic-mono', createdAt: '2026-07-20T10:00:00Z' },
]

function renderPage(code = 'john-jane-001') {
  ;(useRouter as jest.Mock).mockReturnValue({
    query: { code },
    push: mockPush,
  })
  return render(<AlbumPage />)
}

describe('Album Gallery Page (/album/[code])', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    originalFetch = global.fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
    global.fetch = originalFetch
  })

  function mockFetchSuccess(photos = mockPhotos, room = mockRoom) {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => room })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ photos }) })
  }

  it('should show loading state initially', () => {
    ;(global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should fetch room details and photos on mount', async () => {
    mockFetchSuccess()
    renderPage()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/rooms/john-jane-001', expect.any(Object))
    })
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/rooms/john-jane-001/photos', expect.any(Object))
    })
  })

  it('should display room name', async () => {
    mockFetchSuccess()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('John & Jane Wedding')).toBeInTheDocument()
    })
  })

  it('should display photos in a grid', async () => {
    mockFetchSuccess()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  it('should display guest names for each photo', async () => {
    mockFetchSuccess()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('should display filter type for each photo', async () => {
    mockFetchSuccess()
    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText(/retro/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/classic.?mono/i).length).toBeGreaterThan(0)
    })
  })

  it('should sort photos by creation date (newest first)', async () => {
    const reversed = [mockPhotos[1], mockPhotos[0]]
    mockFetchSuccess(reversed)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    const names = screen.getAllByText(/^(Alice|Bob)$/)
    expect(names[0]).toHaveTextContent('Alice')
    expect(names[1]).toHaveTextContent('Bob')
  })

  it('should show empty state when no photos exist', async () => {
    mockFetchSuccess([])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/no photos yet/i)).toBeInTheDocument()
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

  it('should show error when fetch fails', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockRoom })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Server error' }) })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/failed to load|error/i)).toBeInTheDocument()
    })
  })

  it('should display photo images', async () => {
    mockFetchSuccess()
    renderPage()

    await waitFor(() => {
      const images = screen.getAllByRole('img')
      expect(images.length).toBe(2)
      expect(images[0].getAttribute('src')).toBe('/uploads/photo1.jpg')
    })
  })

  it('should auto-refresh photos periodically', async () => {
    jest.useFakeTimers()
    mockFetchSuccess()

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockRoom })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ photos: mockPhotos }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ photos: mockPhotos }) })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    const initialCallCount = (global.fetch as jest.Mock).mock.calls.length

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount)
    })
  })

  it('should display live indicator', async () => {
    mockFetchSuccess()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/live/i)).toBeInTheDocument()
    })
  })
})
