# Development plan

I built the project step by step, and reviewed and tested each step before starting the next.
This file is the plan I worked from, updated with how each step turned out.

## The architecture in short

SQLite is the **source of truth** for products (name, description, category, price). The HNSW
vector index is built from SQLite and can be rebuilt at any time; nothing edits it directly.
A search has three stages:

1. **Filter (SQLite):** the category and price filters give the list of allowed product ids.
2. **Rank (HNSW):** the search text is turned into a vector locally (MiniLM, 384 numbers), and
   HNSW finds the closest product vectors, looking only at the allowed ids.
3. **Load (SQLite):** the full product rows are loaded in ranked order, and results below the
   minimum similarity are dropped.

## Steps

| # | Step | Status |
|---|------|--------|
| 0 | Project skeleton, plus quick tests ("spikes") of the embedding model and HNSW | done |
| 1 | Product dataset **and** evaluation queries with expected results, written together before any search existed, so I couldn't tune one to the other | done (incl. 3 held-out queries) |
| 2 | SQLite layer: schema, queries, and syncing the catalog by SKU | done |
| 3 | Embedding module: load the model once, and one fixed recipe for the text that gets embedded | done |
| 4 | Vector index: build, save safely, and rebuild automatically on startup when it's out of date | done |
| 5 | Search service: filter → rank → load, browsing with an empty query, the relevance cut-off, and a summary (`meta`) in each response | done |
| 6 | Evaluation script (`npm run eval`): search-quality scores, plus HNSW compared with an exact search | done: results and limitations in `docs/evaluation/` |
| 7 | HTTP API: routes, input validation with zod, error handling, API tests | done |
| 8 | Frontend: search, filters, results, and a short explanation of how search works | done; redesigned as the Marlow & Co. demo store |
| 9 | Docker Compose | skipped: optional, and Docker wasn't available to test it |
| 10 | README (decisions, trade-offs, how to run, AI usage) and exported AI conversation logs | done |
| 11 | Deployment on Render | done |

## Decisions per area

### Filtering, and making sure HNSW is accurate (steps 4–6)

- Filter in SQL first, then let HNSW rank only the allowed ids (HNSW supports a filter
  function for this). I don't rank first and filter afterwards: with a strict filter, the top
  results might all be filtered out, leaving an empty page even though matching products exist.
- HNSW is an *approximate* search. Its `ef` setting controls how many candidates it checks; I
  set it to at least the number of products, so at ~100 products it checks everything and the
  result is exact.
- For a much larger catalog (not built): when a filter leaves only a few products, compare
  against them directly instead of using HNSW. Vector databases such as Weaviate and Qdrant do
  this.
- hnswlib-node only accepts plain arrays, so vectors are converted with `Array.from()`.

### Keeping SQLite and the index in sync (steps 2 and 4)

- Ingest writes to SQLite first, then rebuilds the whole index (about a second at this size).
- For each product I hash the exact text that gets embedded. The hash is calculated from
  SQLite when needed, not stored, so it can't go stale, and changing the embedding recipe is
  noticed automatically.
- Next to the index I save a small file with a **fingerprint**: one hash covering every
  product's id and text hash, plus the model name and vector size. If anything changes, the
  fingerprint changes. Both files are written to a temporary name first and then renamed, so a
  crash can't leave a half-written file.
- On startup the fingerprint is recalculated from SQLite. The index is rebuilt if it's
  missing, unreadable or out of date.
- Tests had to prove that the check notices a changed description, a deleted product, an
  added product and a model or recipe change, and that it does **not** rebuild when nothing
  changed.
- While the server runs, it checks SQLite's `data_version` (a counter that changes when another
  process writes) before each search. If `npm run ingest` changed the database, the server runs
  the same check as at startup, so new and edited products are searchable without a restart.
- A deleted product can never be returned, even before a rebuild, because filtering and loading
  rows always go through SQLite.
- Not built: an API for editing products, updating the index one product at a time, or an
  outbox pattern.

### Dataset (step 1)

- 72 products, 12 per category, in `backend/data/products.json`, each with `sku`, `name`,
  `description`, `category` and `price` (euros in the file, stored as whole cents).
- The `sku` is the stable product code used by tests and the evaluation. The SQLite `id` is
  internal, and is also the label of the product's vector in HNSW.
- Descriptions explain what a product is for, avoid generic marketing phrases, and must **not**
  reuse the wording of the evaluation queries (a test checks this). Some products are
  deliberate traps: they share words with a query but are the wrong thing, or serve the same
  purpose in a different category.

### Testing is split by layer, so a failure points at its cause

- **Filter tests** (SQL only, no model): category, price range, prices exactly on the
  boundary, combined filters, filters that match nothing, and an empty query with a category.
- **Relevance evaluation** (`npm run eval`, no filters): does the search rank the right
  products first?
- **Search + filter cases:** a small separate group, run only once both parts pass on their
  own.
- **No-result cases**, kept separate because the UI shows a different message for each:
  - the filters match nothing → "No products match these filters"
  - the filters match, but nothing is relevant → "No relevant products found"
  - an unrelated search without filters → "No relevant products found"

### Evaluation (steps 1 and 6)

- 18 hand-written queries with the products they should find (11 searches without filters, 3
  with filters, 4 that should find nothing): reworded needs, synonyms, keyword traps (with
  products that must *not* be in the top 3) and exact names. Plus 3 held-out queries that I
  wrote before running any search.
- Two separate questions, measured separately:
  - **Does the model find the right products?** hit@3 and MRR against the expected results.
  - **Does HNSW find the true closest vectors?** HNSW's results compared with an exact search
    over the same allowed ids.
- Used to choose the relevance cut-off and which product fields get embedded.

### UI (step 8)

- **Planned:** "Strong / Good match" labels next to each result, with the similarity score as
  extra detail. **Changed:** the evaluation showed these labels can overstate weak results (see
  `docs/evaluation/`), so the store shows results in order ("Most relevant first", "Top match")
  and shows the similarity only in the product details.
- A short summary above the results, for example "7 products for 'light for my tent at
  night'", with "Most relevant first · 72 searched by meaning · 5 ms" next to it.
- Example searches (including "something to keep my drink hot on a camping trip") and a short
  "How search works" explanation.
- **When nothing is relevant, say so clearly** ("No relevant products found"). Never show
  low-scoring products as matches.
- **Scores are not percentages.** Cosine similarity isn't a confidence level; even a strong
  MiniLM match can score around 0.5.
- An empty search with filters shows a plain filtered list, without scores.

### Stretch goals (not done)

- A line showing how many results a plain keyword search would find.
- Combining keyword search (SQLite FTS5) with semantic ranking.
