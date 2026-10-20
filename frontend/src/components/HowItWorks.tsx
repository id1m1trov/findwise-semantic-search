export function HowItWorks({ minSimilarity }: { minSimilarity?: number }) {
  return (
    <details className="how-it-works">
      <summary>How does this search work?</summary>
      <ol>
        <li>
          <strong>Filter.</strong> The SQLite database finds every product in the chosen category and price range.
        </li>
        <li>
          <strong>Understand.</strong> A small AI model running on the server (MiniLM) turns your words into a list of
          384 numbers that captures their meaning. Every product description was converted the same way in advance.
        </li>
        <li>
          <strong>Rank.</strong> A vector index (HNSW) compares those numbers and orders the filtered products by how
          close their meaning is to your search, even when they share no words with it.
        </li>
      </ol>
      <p>
        Products below a minimum similarity{minSimilarity !== undefined ? ` (${minSimilarity.toFixed(2)})` : ''} are
        hidden instead of being shown as weak matches. Similarity is a score between 0 and 1, not a percentage: for this
        model around 0.5 is already a strong match, so results are labelled <em>strong</em> or <em>good match</em>.
      </p>
    </details>
  )
}
