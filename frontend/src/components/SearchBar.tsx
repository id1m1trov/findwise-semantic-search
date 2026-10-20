import type { FormEvent } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  examples: string[]
  onExample: (query: string) => void
}

export function SearchBar({ value, onChange, onSubmit, examples, onExample }: SearchBarProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <div className="search">
      <form className="search-form" role="search" onSubmit={handleSubmit}>
        <label htmlFor="search-input" className="visually-hidden">
          Describe what you are looking for
        </label>
        <div className="search-input">
          <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="search-input"
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe what you need, e.g. something to keep my drink hot on a camping trip"
            maxLength={200}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="button-primary">
          Search
        </button>
      </form>
      <div className="examples">
        <span className="examples-label">Try:</span>
        {examples.map((example) => (
          <button key={example} type="button" className="chip" onClick={() => onExample(example)}>
            {example}
          </button>
        ))}
      </div>
    </div>
  )
}
