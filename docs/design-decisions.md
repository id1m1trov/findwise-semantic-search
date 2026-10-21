# Design decisions and trade-offs

The longer version of "Decisions I'd point out" in the [README](../README.md). The project
started from a short assignment brief; when I mention "the brief", that's what I mean.

## Architecture

```text
 products.json ──(npm run ingest / first start)──► SQLite  (source of truth: products, prices)
                                                     │
                                  embed "name. description" with MiniLM (local, 384 dims)
                                                     ▼
                                              HNSW vector index  (derived, saved to a file)

 GET /api/search?q=...&category=...&minPrice=...&maxPrice=...
   1. filter  SQLite returns the ids allowed by category / price
   2. rank    the query is embedded; HNSW ranks only those ids by cosine similarity
   3. load    SQLite returns the rows in ranked order; matches below 0.30 are dropped
```

| Part | Technology | Where |
|---|---|---|
| Search API | Node.js, Express 5, TypeScript, zod validation | `backend/src/api`, `backend/src/search` |
| Structured store | SQLite via `better-sqlite3` | `backend/src/db` |
| Embeddings | `@huggingface/transformers` running `Xenova/all-MiniLM-L6-v2` on the CPU | `backend/src/embeddings` |
| Vector store | `hnswlib-node` (HNSW, cosine), saved next to the database | `backend/src/vector` |
| Frontend | React 19 + Vite, plain CSS, no UI library | `frontend/src` |

## SQLite is the source of truth; the vector index is built from it

Products live in SQLite only. The HNSW index is built from SQLite and can be deleted and
rebuilt at any time (about a second for 72 products). That way the two can never disagree
about what a product *is*: the vector index only answers "which product ids are most
similar".

## Filter in SQL first, then rank with HNSW

The category and price filters give a list of allowed product ids, and HNSW ranks only those.
The alternative, ranking first and filtering afterwards, can leave an empty page: with a
strict filter, the top results might all be filtered out even though matching products exist.

HNSW is an *approximate* search. Its `ef` setting controls how many candidates it checks, and
I set it to at least the number of products, so at this size it checks everything and the
result is exact. The evaluation confirms HNSW returns the same results as an exact search. For
a much larger catalog, I'd compare directly against the products whenever a filter leaves only
a few, as vector databases such as Weaviate and Qdrant do.

## Keeping the two stores in sync

- Next to the index I save a **fingerprint**: one hash covering the model name and every
  product's id and text. On startup it's recalculated from SQLite; if a product was added,
  edited or deleted, the fingerprint no longer matches and the index is rebuilt.
- While the server runs, it checks SQLite's `data_version` (a counter that changes when
  another process writes) before each search, so `npm run ingest` takes effect without a
  restart.
- Deleted products can never be returned, because filtering and row loading always go
  through SQLite.
- Index files are written to a temporary file and renamed, so a crash cannot leave a
  half-written index.

*Not built:* incremental index updates, an outbox pattern or a write API. Ingestion is a CLI
script, since an HTTP ingestion endpoint would be an unauthenticated write API. The server
imports `products.json` only when its database is empty; later catalog edits need
`npm run ingest`.

## Local embeddings, no API key

MiniLM runs in-process on the CPU (about 23 MB, a few milliseconds per query), which keeps the
project self-contained and free to run. The trade-off is quality: the evaluation shows it
relies on word overlap more than a larger model would (see
[evaluation](evaluation/README.md)).

## `hnswlib-node` as the vector store

It is the library the brief suggests and keeps everything in one process with no extra
service. The cost is a native build: Windows needs the Visual Studio C++ Build Tools (see
[getting started](getting-started.md)). LanceDB, which ships prebuilt binaries, was considered as a fallback.

## Prices as integer cents

Floating-point euros make filters subtly wrong (`19.9 * 100 = 1989.9999…`). Prices are stored
as cents, and filter bounds are rounded inwards, so a maximum of €9.499 never includes a €9.50
product.

## A relevance cut-off, presented neutrally

Results below a cosine similarity of 0.30 are dropped, so an unrelated query shows "no close
matches" instead of random products. The evaluation showed 0.30 works as a "nothing relevant"
detector but not as a quality filter. So the UI doesn't label results "strong" or "good": it
shows the order ("Most relevant first", "Top match"), and the similarity appears only in the
product details, explicitly not as a percentage.

## Evaluation instead of tuning

`npm run eval` separates "is the implementation correct?" (HNSW vs exact search: identical)
from "is the model finding the right products?" (hit@3, MRR). Three held-out queries were
written before seeing any results. Weak spots were diagnosed and documented rather than fixed
by rewriting product descriptions to fit the tests.

## Frontend

- No UI framework or component library: plain React and CSS.
- Native `<dialog>` for the product modal, cart and filter sheet, which handles focus trapping
  and Escape for free.
- A frontend-only cart saved in `localStorage`.
- Accessibility and performance were checked with axe (no violations) and Lighthouse (98–100,
  no layout shift).
- Results are revealed with "Load more". The search API has no paging, so browsing all
  products fetches each category separately and merges them; a production API would add an
  `offset` parameter instead.
- Search state is not reflected in the URL, a simplification for a single-page demo.
- Product photos come from [Unsplash](https://unsplash.com/license) and
  [Pexels](https://www.pexels.com/license/). Both licenses allow use without attribution, so
  credits are not shown in the UI; the photographer and source page of every image are
  recorded in [`frontend/src/data/productImages.ts`](../frontend/src/data/productImages.ts).
  Four products without an honest photo match show a placeholder.

## Known limitations

- Matching words can beat matching meaning: "keep my drink hot on a camping trip" ranks a hot
  water bottle just above the thermos.
- The topic is understood better than the direction. For the held-out query about sunlight
  waking me up and wanting a darker bedroom, a headlamp and a lantern rank above the blackout
  curtains. "Charge my phone *without* a power outlet" still puts the wall charger in the top 3.
- Long, chatty queries water down the actual need and get lower scores.
- English only.
- The 0.30 cut-off reliably detects "nothing relevant", but many loosely related products also
  pass it.

## Not included

Docker Compose (optional in the brief; Docker was not available to test it, and an untested
setup was not worth shipping), authentication, rate limiting and checkout.
