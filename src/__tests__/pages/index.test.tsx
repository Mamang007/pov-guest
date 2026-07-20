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
  it('renders without crashing and displays getting started message', () => {
    render(<Home />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent(/To get started, edit the index.tsx file/i)
  })
})
