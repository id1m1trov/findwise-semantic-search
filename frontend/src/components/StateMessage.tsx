import type { ReactNode } from 'react'

interface StateMessageProps {
  tone?: 'neutral' | 'error'
  title: string
  children?: ReactNode
  action?: { label: string; onClick: () => void }
}

/** Shared layout for the welcome, empty and error states. */
export function StateMessage({ tone = 'neutral', title, children, action }: StateMessageProps) {
  return (
    <div className={`state state-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <h2 className="state-title">{title}</h2>
      {children && <div className="state-body">{children}</div>}
      {action && (
        <button type="button" className="button-secondary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
