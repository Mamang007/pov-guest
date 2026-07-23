import { render, screen } from '@testing-library/react'
import Home from '../../pages/index'

// Mock next/head so we don't try to render it in jsdom
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>
    },
  }
})

describe('Home Page', () => {
  it('renders without crashing and displays POV Guest heading', () => {
    render(<Home />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent(/POV Guest/i)
  })

  it('renders create account and sign in buttons', () => {
    render(<Home />)
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
  })
})
