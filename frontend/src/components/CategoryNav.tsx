interface CategoryNavProps {
  categories: string[]
  active: string | null // null on the home page: no category is selected yet
  onSelect: (category: string) => void
}

/** Shop-style category bar; doubles as the category filter (toggle buttons, not page links). */
export function CategoryNav({ categories, active, onSelect }: CategoryNavProps) {
  return (
    <nav className="category-nav" aria-label="Categories">
      <ul>
        {['', ...categories].map((category) => (
          <li key={category || 'all'}>
            <button type="button" aria-pressed={active === category} onClick={() => onSelect(category)}>
              <span className="underline">{category || 'All products'}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
