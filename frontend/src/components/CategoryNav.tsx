interface CategoryNavProps {
  categories: string[]
  active: string | null // null on the home page: no category is selected yet
  onSelect: (category: string) => void
}

/** The category bar under the header. Each category is a button that shows that category. */
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
