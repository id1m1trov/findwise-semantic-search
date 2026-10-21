# Running it locally

## What you need

- **Node.js 22.12 or newer**
- **Python 3 and a C++ compiler.** Installing builds `hnswlib-node` (the vector search
  library) from source, which needs both:
  - **macOS:** the Xcode command line tools (`xcode-select --install`); Python 3 is usually
    already there
  - **Linux:** `python3`, `make` and `g++`
  - **Windows:** Python 3 and the Visual Studio C++ Build Tools. Install "Build Tools for
    Visual Studio 2022" with the **Desktop development with C++** workload, for example:

    ```powershell
    winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--passive --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
    ```

## Start it

```bash
git clone https://github.com/id1m1trov/findwise-semantic-search.git
cd findwise-semantic-search
npm ci                 # install everything
npm run dev:backend    # terminal 1: API on http://localhost:3001
npm run dev:frontend   # terminal 2: open http://localhost:5173
```

On the first start, the backend:

1. downloads the embedding model (~23 MB),
2. fills the SQLite database from `backend/data/products.json`,
3. builds the vector index.

All of this goes into `backend/data/generated/`. It's ignored by git and safe to delete;
everything is recreated on the next start.

## Other commands

```bash
npm run ingest   # re-import backend/data/products.json after editing it
npm run build    # production build of the backend and frontend
npm start        # serve the production build (API + frontend) on http://localhost:3001
```

`npm run ingest` also works while the backend is running: the server notices the database
changed and updates its search index before the next search.

## Tests

```bash
npm test                # all backend and frontend tests
npm run test:backend    # filtering, ranking, index sync and the API
npm run test:frontend   # cart, formatting and API-client logic
npm run eval            # search quality with the real model
```

What each test covers: [testing.md](testing.md).

## If something doesn't work

- **`npm ci` fails while building `hnswlib-node`:** the compiler or Python is missing; see
  "What you need" above.
- **The page says the search is unavailable:** the backend isn't running yet, or is still
  loading the model on first start. Give it a few seconds and try again.

These two small scripts check the embedding model and the vector index on their own:

```bash
npm run spike:embeddings
npm run spike:hnsw
```
