import type { ReactNode } from 'react'

interface EmptyStateProps {
  tone?: 'neutral' | 'error'
  title: string
  children?: ReactNode
  action?: { label: string; onClick: () => void }
}

/**
 * The message shown when there are no results or something went wrong. Its title is the page's
 * h1. Screen readers hear normal messages through SearchResults; errors are announced right away
 * with role="alert".
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
