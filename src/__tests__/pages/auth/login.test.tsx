import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import LoginPage from '@/pages/login'

const mockPush = jest.fn()

function renderPage() {
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  return render(<LoginPage />)
}

function fillField(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function submitForm() {
  fireEvent.click(screen.getByRole('button', { name: /sign in|log in|login/i }))
}

describe('Login Page', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    originalFetch = global.fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('should render login form with email and password fields', () => {
    renderPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('should render a submit button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /sign in|log in|login/i })).toBeInTheDocument()
  })

  it('should render a link to register page', () => {
    renderPage()
    const link = screen.getByRole('link', { name: /sign up|register/i })
    expect(link).toHaveAttribute('href', '/register')
  })

  it('should show validation error when email is invalid', async () => {
    renderPage()
    fillField(/email/i, 'invalid-email')
    fillField(/password/i, 'password123')
    submitForm()

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should show validation error when password is empty', async () => {
    renderPage()
    fillField(/email/i, 'test@example.com')
    submitForm()

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should call API and redirect to dashboard on successful login', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ host: { id: '1', name: 'John', email: 'test@example.com' } }),
    })

    renderPage()
    fillField(/email/i, 'test@example.com')
    fillField(/password/i, 'password123')
    submitForm()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      }))
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should display API error message on login failure', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' }),
    })

    renderPage()
    fillField(/email/i, 'test@example.com')
    fillField(/password/i, 'wrongpassword')
    submitForm()

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should show loading state during submission', async () => {
    let resolveFetch: (value: unknown) => void
    ;(global.fetch as jest.Mock).mockReturnValue(
      new Promise((resolve) => { resolveFetch = resolve })
    )

    renderPage()
    fillField(/email/i, 'test@example.com')
    fillField(/password/i, 'password123')
    submitForm()

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled()
    })

    resolveFetch!({ ok: true, status: 200, json: async () => ({ host: {} }) })
  })

  it('should display network error when fetch throws', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    renderPage()
    fillField(/email/i, 'test@example.com')
    fillField(/password/i, 'password123')
    submitForm()

    await waitFor(() => {
      expect(screen.getByText(/something went wrong|network error|try again/i)).toBeInTheDocument()
    })
  })
})
