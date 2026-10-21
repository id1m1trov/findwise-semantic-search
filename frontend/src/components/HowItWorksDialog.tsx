import type { Ref } from 'react'

/** Uses the browser's built-in <dialog>: it keeps keyboard focus inside and closes on Escape. */
export function HowItWorksDialog({ ref }: { ref: Ref<HTMLDialogElement> }) {
  return (
    <dialog ref={ref} className="dialog" aria-labelledby="how-it-works-title">
      <form method="dialog">
        <h2 id="how-it-works-title">How search works</h2>
        <ol>
          <li>
            <strong>Filter.</strong> A database finds every product in the chosen category and price range.
          </li>
          <li>
            <strong>Understand.</strong> A small AI model on our server turns your words into numbers that capture their
            meaning. Every product description was converted the same way in advance.
          </li>
          <li>
            <strong>Rank.</strong> A vector index orders the filtered products by how close their meaning is to your
            search, even when they share no words with it. Products that aren't close enough are left out.
          </li>
        </ol>
        <p className="dialog-note">
          Opening a product from a search shows its similarity to your search: a score from 0 to 1 that compares
          meanings. It is not a percentage or a guarantee, so results are simply listed with the most relevant first.
        </p>
        <button type="submit" className="button-primary">
          Close
        </button>
      </form>
    </dialog>
  )
}
