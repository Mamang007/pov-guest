import React from 'react'

// Mock all Astryx components as simple pass-through wrappers
export const Button = ({ label, onClick, type, ...props }: any) => (
  <button onClick={onClick} type={type} disabled={props.isLoading || props.isDisabled} aria-label={label}>
    {label}
  </button>
)

export const TextInput = ({ label, value, onChange, placeholder, status, type, ...props }: any) => (
  <div>
    <label htmlFor={label}>{label}</label>
    <input
      id={label}
      type={type || 'text'}
      value={value}
      onChange={(e) => onChange?.(e.target.value, e)}
      placeholder={placeholder}
      aria-invalid={status?.type === 'error' ? true : undefined}
    />
    {status?.message && <span role="alert">{status.message}</span>}
  </div>
)

export const Card = ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>
export const VStack = ({ children, ...props }: any) => <div data-testid="vstack">{children}</div>
export const HStack = ({ children, ...props }: any) => <div data-testid="hstack">{children}</div>
export const Grid = ({ children, ...props }: any) => <div data-testid="grid">{children}</div>
export const Heading = ({ children, level, ...props }: any) => {
  const Tag = `h${level || 1}` as keyof JSX.IntrinsicElements
  return <Tag>{children}</Tag>
}
export const Text = ({ children, ...props }: any) => <span>{children}</span>
export const Badge = ({ label, ...props }: any) => <span data-testid="badge">{label}</span>
export const Banner = ({ status, title, ...props }: any) => <div role="alert" data-status={status}>{title}</div>
export const Center = ({ children, ...props }: any) => <div>{children}</div>
export const Theme = ({ children, ...props }: any) => <>{children}</>
