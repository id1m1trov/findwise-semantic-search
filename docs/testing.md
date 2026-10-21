# Testing

There are three kinds of checks. Each one answers a different question, so when something
fails you know where to look.

| Command | What it checks | Speed |
|---|---|---|
| `npm test` | Everything below: backend tests, then frontend tests | ~10 s (longer on the first run) |
| `npm run test:backend` | Filtering, ranking, index sync and the HTTP API (77 tests) | a few seconds |
| `npm run test:frontend` | Cart, formatting, pagination and API-client logic (38 tests) | about a second |
| `npm run eval` | Search *quality* with the real model: does the right product come first? | a few seconds |

Tests use [Vitest](https://vitest.dev/). They never touch the app's database: each test builds
its own small in-memory catalog.

**First run:** the real-model test downloads the embedding model (~23 MB) into
`backend/data/generated/model-cache/`, so the first `npm test` can take up to a minute.

**One file at a time:**

```bash
npm run test:backend -- tests/api.test.ts
npm run test:frontend -- tests/cart.test.ts
```

## Backend tests (`backend/tests/`)

Most backend tests use a **fake embedder** (`tests/helpers/fakeEmbedder.ts`) instead of the
real model. It turns text into a simple word-count vector, so texts that share words get
similar vectors. It doesn't understand meaning, but it is fast and fully predictable, which is
what you want for testing filters, ordering and error handling. Only one test file loads the
real model.

| File | What it checks |
|---|---|
| `productRepository.test.ts` | SQL filtering only: categories, inclusive price ranges, no matches. No embeddings involved. |
| `catalog.test.ts` | Euros become exact cents, price filters are never widened by rounding, bad catalog data is rejected, and the real dataset and evaluation queries are consistent. |
| `vectorIndex.test.ts` | The HNSW index with hand-made vectors: nearest neighbours, filtering by allowed ids, save and load. |
| `indexManager.test.ts` | The index is rebuilt exactly when the products or the model changed, and embedding happens in small batches. |
| `syncedIndex.test.ts` | A running server picks up database changes made by another process (such as `npm run ingest`). |
| `searchService.test.ts` | The search pipeline (filter → rank → load), the relevance cut-off and the response summary. |
| `api.test.ts` | The HTTP API: parameter validation, response shape, error handling and serving the built frontend. |
| `integration/realModel.test.ts` | End to end with the real model and the real 72-product catalog. |

## Frontend tests (`frontend/tests/`)

These cover the logic behind the UI, not the rendered components.

| File | What it checks |
|---|---|
| `cart.test.ts` | Adding, removing and changing quantities; totals; reading a saved cart safely. |
| `format.test.ts` | Price formatting, price-range validation and the result headings. |
| `pagination.test.ts` | "Load more" page counts. |
| `pricePresets.test.ts` | The price filter options don't overlap and cover every price. |
| `productImages.test.ts` | Every photo belongs to a real product and credits its photographer; every category has a cover photo. |
| `searchApi.test.ts` | Building request URLs, merging per-category results and turning errors into readable messages. |

## Relevance evaluation (`npm run eval`)

Unit tests check that the code behaves correctly. They can't tell whether the model finds the
*right* products, so a separate script measures that with hand-labelled queries. Results and
findings are in [docs/evaluation](evaluation/README.md).

## Spikes

Throwaway checks kept from the setup phase, to confirm the two native pieces work on a new
machine:

```bash
npm run spike:embeddings   # local embeddings + similarity ranking for a sample query
npm run spike:hnsw         # HNSW search, filter callback, edge cases, save/load round trip
```
