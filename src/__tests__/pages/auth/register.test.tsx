import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import RegisterPage from '@/pages/register'

const mockPush = jest.fn()

function renderPage() {
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  return render(<RegisterPage />)
}

function fillField(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function submitForm() {
  fireEvent.click(screen.getByRole('button', { name: /sign up|register|create/i }))
}

describe('Register Page', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    originalFetch = global.fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('should render registration form with name, email, and password fields', () => {
    renderPage()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('should render a submit button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /sign up|register|create/i })).toBeInTheDocument()
  })

  it('should render a link to login page', () => {
    renderPage()
    const link = screen.getByRole('link', { name: /login|sign in/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  it('should show validation error when name is empty', async () => {
    renderPage()
    fillField(/email/i, 'test@example.com')
    fillField(/password/i, 'password123')
    submitForm()

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should show validation error when email is invalid', async () => {
    renderPage()
    fillField(/name/i, 'John Doe')
    fillField(/email/i, 'invalid-email')
    fillField(/password/i, 'password123')
    submitForm()

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should show validation error when password is less than 6 characters', async () => {
    renderPage()
    fillField(/name/i, 'John Doe')
    fillField(/email/i, 'test@example.com')
    fillField(/password/i, '12345')
    submitForm()

    await waitFor(() => {
      expect(screen.getByText(/at least 6 character/i)).toBeInTheDocument()
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should call API and redirect to login on successful registration', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ host: { id: '1', name: 'John', email: 'test@example.com' } }),
    })

    renderPage()
    fillField(/name/i, 'John Doe')
    fillField(/email/i, 'test@example.com')
    fillField(/password/i, 'password123')
    submitForm()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John Doe', email: 'test@example.com', password: 'password123' }),
      }))
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('should display API error message on registration failure', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Email already registered' }),
    })

    renderPage()
    fillField(/name/i, 'John Doe')
    fillField(/email/i, 'test@example.com')
    fillField(/password/i, 'password123')
    submitForm()

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should show loading state during submission', async () => {
    let resolveFetch: (value: unknown) => void
    ;(global.fetch as jest.Mock).mockReturnValue(
      new Promise((resolve) => { resolveFetch = resolve })
    )

    renderPage()
    fillField(/name/i, 'John Doe')
    fillField(/email/i, 'test@example.com')
    fillField(/password/i, 'password123')
    submitForm()

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled()
    })

    resolveFetch!({ ok: true, status: 201, json: async () => ({ host: {} }) })
  })

  it('should display network error when fetch throws', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    renderPage()
    fillField(/name/i, 'John Doe')
    fillField(/email/i, 'test@example.com')
    fillField(/password/i, 'password123')
    submitForm()

    await waitFor(() => {
      expect(screen.getByText(/something went wrong|network error|try again/i)).toBeInTheDocument()
    })
  })
})
