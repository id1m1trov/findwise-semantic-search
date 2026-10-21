import type { ReactNode } from 'react'

interface EmptyStateProps {
  tone?: 'neutral' | 'error'
  title: string
  children?: ReactNode
  action?: { label: string; onClick: () => void }
}

/**
 * Plain, left-aligned message for empty and error states. Its title is the page's h1.
 * Neutral outcomes are announced by the live region in SearchResults; errors use role="alert".
 */
export function EmptyState({ tone = 'neutral', title, children, action }: EmptyStateProps) {
  return (
    <div className={`empty-state ${tone === 'error' ? 'is-error' : ''}`} role={tone === 'error' ? 'alert' : undefined}>
      <h1>{title}</h1>
      {children}
      {action && (
        <button type="button" className="button-secondary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
