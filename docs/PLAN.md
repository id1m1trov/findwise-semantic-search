# Development plan

Built step by step; each step is reviewed and tested before the next one starts.

## Architecture in one paragraph

SQLite is the **source of truth** for products (name, description, category, price).
The HNSW vector index is a **derived artifact**: built from SQLite, rebuildable at any
time, never edited by hand. A search runs in three stages:

1. **Filter (SQLite)**: category / price filters produce the set of allowed product ids.
2. **Rank (HNSW)**: the query is embedded locally (MiniLM, 384 dims) and HNSW finds the
   nearest product vectors, restricted to the allowed ids via a filter callback.
3. **Hydrate (SQLite)**: full product rows are loaded for the ranked ids; results below
   the relevance cutoff are dropped.

## Steps

| # | Step | Status |
|---|------|--------|
| 0 | Workspace skeleton, embedding + HNSW spikes | done |
| 1 | Product dataset **and** evaluation queries with expected results, written together (before any search results exist, to avoid overfitting) | done (held-out queries pending) |
| 2 | SQLite layer: schema, repository, catalog sync by SKU | done |
| 3 | Embedding module: model loaded once, one documented "embedding text" recipe | done |
| 4 | Vector index: build/rebuild, atomic file write, fingerprint-based staleness check on startup | done |
| 5 | Search service: filter → rank → hydrate, empty-query path, relevance cutoff, response `meta` | done |
| 6 | Evaluation script (`npm run eval`): relevance metrics + HNSW vs exact comparison | script done; final run after held-out queries |
| 7 | HTTP API: routes, zod validation, error handling, API tests | done |
| 8 | Frontend: search, filters, results, explanation of the pipeline | done |
| 9 | Docker Compose (Docker not yet installed on the dev machine) | |
| 10 | README (decisions, trade-offs, how to run, AI usage) + exported AI conversation logs | |

## Decisions and requirements per area

### Filtering and HNSW accuracy (steps 4–6)
- Filter in SQL first, then HNSW with a filter callback. Post-filtering (HNSW top-K, then
  SQL) is rejected: a selective filter can leave an empty page even though matches exist.
- Set `ef` (the search's candidate-list size) ≥ catalog size, so at ~100 products the
  search is effectively exhaustive.
- Production note for the README (not built): below a cardinality threshold, fall back to
  brute-force exact search (the Weaviate / Qdrant approach).
- hnswlib-node only accepts plain arrays: convert typed vectors with `Array.from()`.

### Keeping SQLite and the index in sync (steps 2 and 4)
- Ingestion writes SQLite first, then rebuilds the whole index (~1 s at this size).
- Each product's `content_hash` = SHA-256 of the exact text that gets embedded. It is
  computed from the SQLite row when needed rather than stored, so it can never be stale
  and a change to the embedding-text recipe is detected automatically.
- The index is saved with a sidecar metadata file containing a **fingerprint**: a hash of
  the sorted `(id, content_hash)` pairs, the model name and the vector dimension. Index + metadata are written atomically (temp file + rename).
- On startup the fingerprint is recomputed from SQLite; rebuild if the index or metadata
  is missing/unreadable or the fingerprint differs.
- Tests must prove the check detects: changed description, deleted product, added
  product, model / recipe change; and does **not** rebuild when nothing changed.
- While the server runs, it checks SQLite's `data_version` before each search; if another
  process (e.g. `npm run ingest`) changed the database, it re-runs the same load-or-rebuild
  check, so added and edited products are searchable without a restart.
- Deleted products can never be returned even before a rebuild: filtering and hydration
  come from SQLite.
- Not built (production notes): CRUD API, incremental index updates, outbox pattern.

### Dataset (step 1)
- 72 products, 12 per category, in `backend/data/products.json`: `sku`, `name`,
  `description`, `category`, `price` (EUR in JSON, stored as integer cents).
- `sku` is the stable business key (used by tests and the eval file); the SQLite
  integer `id` is internal and is the HNSW label.
- Descriptions explain purpose and use, avoid shared marketing filler, and must **not**
  reuse the wording of the eval queries (checked automatically). Keyword traps (shared
  words, different meaning) and same-purpose products across categories are deliberate.

### Testing is split by layer, so a failure points at its cause
- **Filter tests (SQL only, deterministic, vitest)**: category, price range, inclusive
  price boundaries, combined filters, filters that exclude every product, empty query +
  category (plain filtered list). No embeddings involved.
- **Relevance eval (`npm run eval`, no filters)**: does the semantic search rank the
  right products first?
- **Combined eval cases (query + filters)**: a small separate group, run only after both
  layers pass on their own.
- **No-result cases**, kept distinct because the UI shows different messages:
  - filters exclude everything → "No products match these filters"
  - filters match, but nothing is relevant → "No relevant products found"
  - unrelated query without filters → "No relevant products found"

### Evaluation (steps 1 and 6)
- ~15 hand-written queries with expected SKUs: intent paraphrases, synonyms, keyword
  traps (with "must not be in top 3" SKUs), exact names and no-match queries; plus 3
  held-out queries written by the developer before running the search.
- Two separate questions, two separate metrics:
  - **Is the embedding model finding relevant products?** hit@3 and MRR against the
    hand-written expected results.
  - **Is HNSW finding the true nearest neighbours?** recall@k of HNSW vs exact
    brute-force cosine similarity over the same allowed ids.
- Used to choose the relevance cutoff, the relevance bands shown in the UI, and which
  product fields are embedded.

### UI (step 8)
- Show a relevance indicator per result and a one-line pipeline summary, e.g.
  "18 products match your filters · ranked by meaning · 5 relevant · 21 ms".
- Example query chips (incl. "something to keep my drink hot on a camping trip") and a
  short collapsible "How it works".
- **No relevant results → say so clearly** ("No relevant products found"); never present
  low-scoring products as matches.
- **Scores are not percentages.** Cosine similarity is not a confidence/probability
  (a strong MiniLM match can be ~0.5). Show bands (e.g. strong / good match) derived from
  the evaluation, with the raw similarity as secondary detail (e.g. "similarity 0.52").
- Empty query + filters → plain filtered list, no scores.

### Stretch goals (only if time allows)
- "Keyword search would find N results" comparison line.
- Hybrid keyword + semantic ranking (SQLite FTS5).
