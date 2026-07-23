import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import RoomPage from '@/pages/room/[code]'

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockStream = { getTracks: () => [{ stop: jest.fn() }] }

const mockRoom = {
  id: 'room-uuid-1',
  name: 'John & Jane Wedding',
  code: 'john-jane-001',
  presetFilter: 'retro',
  createdAt: '2026-07-20T10:00:00Z',
}

function setupCameraMocks() {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockResolvedValue(mockStream),
    },
    writable: true,
    configurable: true,
  })
  HTMLVideoElement.prototype.play = jest.fn().mockResolvedValue(undefined)
  Object.defineProperty(HTMLVideoElement.prototype, 'srcObject', {
    set: jest.fn(),
    get: jest.fn().mockReturnValue(null),
    configurable: true,
  })
}

function setupCanvasMocks() {
  const mockCtx = { drawImage: jest.fn(), filter: '', width: 0, height: 0 }
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockCtx)
  HTMLCanvasElement.prototype.toBlob = jest.fn((cb: BlobCallback) => {
    cb(new Blob(['test-data'], { type: 'image/jpeg' }))
  })
}

function renderPage(code = 'john-jane-001', guest = 'Alice') {
  ;(useRouter as jest.Mock).mockReturnValue({
    query: { code, guest },
    push: mockPush,
    replace: mockReplace,
    isReady: true,
  })
  return render(<RoomPage />)
}

function mockRoomAndPhotosFetch(photos: unknown[] = []) {
  ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('/photos')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ photos }) })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => mockRoom })
  })
}

async function openCamera() {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /take a photo/i })).toBeInTheDocument()
  })
  fireEvent.click(screen.getByRole('button', { name: /take a photo/i }))
}

async function waitForCameraReady() {
  await waitFor(() => {
    expect(screen.getByTestId('camera-video')).toBeInTheDocument()
  })
}

describe('Room Camera Page (/room/[code])', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    originalFetch = global.fetch
    global.fetch = jest.fn()
    setupCameraMocks()
    setupCanvasMocks()
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
    mockRoomAndPhotosFetch()
    renderPage()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/rooms/john-jane-001', expect.any(Object))
    })
  })

  it('should display room name after loading', async () => {
    mockRoomAndPhotosFetch()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('John & Jane Wedding')).toBeInTheDocument()
    })
  })

  it('should display guest name', async () => {
    mockRoomAndPhotosFetch()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/alice/i)).toBeInTheDocument()
    })
  })

  it('should redirect to join page if no guest name', () => {
    ;(useRouter as jest.Mock).mockReturnValue({
      query: { code: 'john-jane-001' },
      push: mockPush,
      replace: mockReplace,
      isReady: true,
    })
    ;(global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}))
    render(<RoomPage />)

    expect(mockReplace).toHaveBeenCalledWith('/join/john-jane-001')
  })

  it('should show gallery view by default with Take a Photo button', async () => {
    mockRoomAndPhotosFetch()
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /take a photo/i })).toBeInTheDocument()
    })
  })

  it('should request camera access after opening camera', async () => {
    mockRoomAndPhotosFetch()
    renderPage()

    await openCamera()

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled()
    })
  })

  it('should show video element as viewfinder', async () => {
    mockRoomAndPhotosFetch()
    renderPage()

    await openCamera()
    await waitForCameraReady()
    expect(screen.getByTestId('camera-video')).toBeInTheDocument()
  })

  it('should show file selector fallback when camera is unavailable', async () => {
    ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(new Error('Camera denied'))
    mockRoomAndPhotosFetch()
    renderPage()

    await openCamera()

    await waitFor(() => {
      expect(screen.getByText(/camera not available/i)).toBeInTheDocument()
    })
  })

  it('should show filter toggle button', async () => {
    mockRoomAndPhotosFetch()
    renderPage()

    await openCamera()
    await waitForCameraReady()
    expect(screen.getByRole('button', { name: /^filter (on|off)$/i })).toBeInTheDocument()
  })

  it('should show filter switcher buttons', async () => {
    mockRoomAndPhotosFetch()
    renderPage()

    await openCamera()
    await waitForCameraReady()
    expect(screen.getByRole('button', { name: /^retro$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /classic.?mono/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /warm.?film/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cyan.?drift/i })).toBeInTheDocument()
  })

  it('should toggle filter off when toggle button clicked', async () => {
    mockRoomAndPhotosFetch()
    renderPage()

    await openCamera()
    await waitForCameraReady()
    const video = screen.getByTestId('camera-video') as HTMLVideoElement
    expect(video.style.filter).not.toBe('none')

    fireEvent.click(screen.getByRole('button', { name: /^filter (on|off)$/i }))

    expect(video.style.filter).toBe('none')
  })

  it('should switch filter when a different filter button is clicked', async () => {
    mockRoomAndPhotosFetch()
    renderPage()

    await openCamera()
    await waitForCameraReady()
    fireEvent.click(screen.getByRole('button', { name: /cyan.?drift/i }))

    const video = screen.getByTestId('camera-video') as HTMLVideoElement
    expect(video.style.filter).toContain('hue-rotate')
  })

  it('should have a capture button', async () => {
    mockRoomAndPhotosFetch()
    renderPage()

    await openCamera()
    await waitForCameraReady()
    expect(screen.getByRole('button', { name: /capture/i })).toBeInTheDocument()
  })

  it('should upload photo on capture', async () => {
    ;(global.fetch as jest.Mock)
      .mockImplementation((url: string) => {
        if (url.includes('/photos') && !url.includes('upload')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ photos: [] }) })
        }
        if (url.includes('/upload')) {
          return Promise.resolve({ ok: true, status: 201, json: async () => ({ photo: { id: 'p1', imageUrl: '/uploads/test.jpg', guestName: 'Alice', filterApplied: 'retro' } }) })
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => mockRoom })
      })

    renderPage()

    await openCamera()
    await waitForCameraReady()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /capture/i })).not.toBeDisabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /capture/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/photos/upload', expect.objectContaining({
        method: 'POST',
      }))
    })
  })

  it('should show success message after upload', async () => {
    ;(global.fetch as jest.Mock)
      .mockImplementation((url: string) => {
        if (url.includes('/photos') && !url.includes('upload')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ photos: [] }) })
        }
        if (url.includes('/upload')) {
          return Promise.resolve({ ok: true, status: 201, json: async () => ({ photo: { id: 'p1', imageUrl: '/uploads/test.jpg', guestName: 'Alice', filterApplied: 'retro' } }) })
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => mockRoom })
      })

    renderPage()

    await openCamera()
    await waitForCameraReady()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /capture/i })).not.toBeDisabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /capture/i }))

    await waitFor(() => {
      expect(screen.getByText(/uploaded|success|photo added/i)).toBeInTheDocument()
    })
  })

  it('should show error message when upload fails', async () => {
    ;(global.fetch as jest.Mock)
      .mockImplementation((url: string) => {
        if (url.includes('/photos') && !url.includes('upload')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ photos: [] }) })
        }
        if (url.includes('/upload')) {
          return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: 'Upload failed' }) })
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => mockRoom })
      })

    renderPage()

    await openCamera()
    await waitForCameraReady()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /capture/i })).not.toBeDisabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /capture/i }))

    await waitFor(() => {
      expect(screen.getByText(/upload failed|error|try again/i)).toBeInTheDocument()
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
})
