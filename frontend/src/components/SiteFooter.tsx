interface SiteFooterProps {
  categories: string[]
  onShop: (category: string) => void
  onHowItWorks: () => void
}

const REPOSITORY = 'https://github.com/id1m1trov/findwise-semantic-search'

export function SiteFooter({ categories, onShop, onHowItWorks }: SiteFooterProps) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <p className="footer-wordmark">Marlow &amp; Co.</p>
          <p>Everyday gear for the outdoors, the kitchen and the home.</p>
        </div>
        <nav aria-labelledby="footer-shop">
          <h2 id="footer-shop">Shop</h2>
          <ul>
            {['', ...categories].map((category) => (
              <li key={category || 'all'}>
                <button type="button" className="footer-link" onClick={() => onShop(category)}>
                  {category || 'All products'}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-labelledby="footer-about">
          <h2 id="footer-about">About this demo</h2>
          <ul>
            <li>
              <button type="button" className="footer-link" onClick={onHowItWorks}>
                How search works
              </button>
            </li>
            <li>
              <a className="footer-link" href={REPOSITORY} target="_blank" rel="noreferrer">
                Source code on GitHub<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a className="footer-link" href="https://unsplash.com" target="_blank" rel="noreferrer">
                Photos from Unsplash<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a className="footer-link" href="https://www.pexels.com" target="_blank" rel="noreferrer">
                Photos from Pexels<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <p className="footer-note">
        Marlow &amp; Co. is a demo store for a semantic product search prototype. Products are fictional and no orders
        are taken.
      </p>
    </footer>
  )
}
