# findwise-semantic-search

Proof-of-concept semantic product search: a TypeScript/Express backend that combines
vector search (hnswlib-node + local transformers.js embeddings) with structured filtering
in SQLite, and a React + Vite frontend.

> Work in progress. Design decisions, trade-offs and AI-tool usage will be documented here
> as the project is built.

## Prerequisites

- Node.js 22.12+ (required by `better-sqlite3` and `vitest`; developed on Node 24)
- **Windows only: Visual Studio C++ Build Tools.** `hnswlib-node` publishes no prebuilt
  Windows binary, so `npm install` compiles it from source with node-gyp. Install
  "Build Tools for Visual Studio 2022" with the **Desktop development with C++** workload
  (MSVC v143 + a Windows SDK), e.g.:

  ```powershell
  winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--passive --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  ```

  macOS needs the Xcode command line tools; Linux needs `python3`, `make` and `g++`.

## Getting started

```bash
git clone https://github.com/id1m1trov/findwise-semantic-search.git
cd findwise-semantic-search
npm ci                 # installs both workspaces (backend, frontend); compiles hnswlib-node
npm run dev:backend    # terminal 1: http://localhost:3001/api/health
npm run dev:frontend   # terminal 2: open http://localhost:5173
```

Nothing else needs to exist on your machine. On the first start the backend:

1. downloads the embedding model (`Xenova/all-MiniLM-L6-v2`, ~23 MB, cached under `node_modules`),
2. seeds SQLite from `backend/data/products.json`,
3. builds the vector index.

The database and index live in `backend/data/generated/`: generated, git-ignored, and safe to
delete (they are rebuilt on the next start).

```bash
npm run ingest   # re-import products.json into SQLite; rebuilds the index only if something changed
npm test         # backend + frontend tests (the first run may download the model)
npm run eval     # relevance evaluation: hit@3, MRR, keyword traps, HNSW vs exact search
npm run build    # production build of both workspaces; then `npm start -w backend`
```

`npm run ingest` also works while the backend is running: the server notices the database
changed and refreshes its index before the next search.

## Search API

| Endpoint | Description |
|---|---|
| `GET /api/search` | `q` (free text, max 200 chars; empty = browse), `category` (exact name from `/api/categories`), `minPrice` / `maxPrice` (EUR, inclusive), `limit` (1–50, default 10) |
| `GET /api/categories` | Category names for the filter |
| `GET /api/health` | Status and product count |

```bash
curl "http://localhost:3001/api/search?q=keep+my+drink+hot&category=Kitchen+%26+Drinkware&maxPrice=40&limit=5"
```

Each result has `sku`, `name`, `description`, `category`, `price`, `similarity` (cosine
similarity, not a percentage) and `relevance` (`strong` / `good`). `meta.outcome` is
`results`, `no_filter_matches` (filters exclude everything) or `no_relevant_matches`
(nothing similar enough). Invalid parameters return `400` with the field and reason.

## Demo store frontend

The React app presents the search as a small shop, "Marlow & Co.": home page, category
browsing, filters, product details and a cart. The cart is frontend-only (saved in
`localStorage`, no checkout).

Product photos come from [Unsplash](https://unsplash.com/license) and
[Pexels](https://www.pexels.com/license/). Both licenses allow free use without attribution,
so credits are not shown in the UI; the photographer and source page of every image are
recorded in [`frontend/src/data/productImages.ts`](frontend/src/data/productImages.ts). Each photo
was checked against its product; four products without an honest match (water filter straw,
electric underblanket, doorway pull-up bar, heart-rate chest strap) show a placeholder.
Images are loaded from the Unsplash and Pexels CDNs, not stored in this repository.

Browsing "all products" without a query fetches one category at a time and merges the
results, because the search API returns at most 50 products and has no paging; a production
API would add an `offset` parameter instead.

## Evaluation and known limitations

`npm run eval` measures the search implementation (HNSW vs exact search: identical in every
case) separately from the embedding model's relevance (hit@3 0.91 / MRR 0.88 on the baseline
queries, 0.67 / 0.75 on three held-out queries written before seeing results). Full results
and diagnostics: [docs/evaluation](docs/evaluation/README.md).

Known limitations of the current model and set-up:

- Surface word overlap can beat meaning: "keep my drink hot on a camping trip" ranks a hot
  water bottle just above the thermos.
- Topic is understood better than direction or negation ("make my bedroom darker" finds
  lamps; "*without* a power outlet" still finds the wall charger).
- Long, conversational queries dilute the actual need and produce lower scores.
- English only.
- The 0.30 similarity cut-off reliably detects "nothing relevant", but many loosely related
  products also pass it, so the relevance labels can overstate weak matches.
- The server imports `products.json` only when its database is empty; later catalog edits
  need `npm run ingest` (a running server picks them up automatically). There is
  deliberately no HTTP ingestion endpoint, as it would be an unauthenticated write API.

### Spikes

Throwaway checks kept from the setup phase:

```bash
npm run spike:embeddings   # local embeddings + similarity ranking for a sample query
npm run spike:hnsw         # HNSW kNN, filter callback, edge cases, save/load round trip
```
