# findwise-semantic-search

Proof-of-concept semantic product search: a TypeScript/Express backend that combines
vector search (hnswlib-node + local transformers.js embeddings) with structured filtering
in SQLite, and a React + Vite frontend.

> Work in progress. Design decisions, trade-offs and AI-tool usage will be documented here
> as the project is built.

## Prerequisites

- Node.js 20+ (developed on Node 24)
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
npm install            # installs both workspaces (backend, frontend)
npm run dev:backend    # http://localhost:3001/api/health
npm run dev:frontend   # http://localhost:5173
```

The first run downloads the embedding model (`Xenova/all-MiniLM-L6-v2`, ~23 MB) and caches it.

### Spikes

Throwaway checks kept from the setup phase:

```bash
npm run spike:embeddings   # local embeddings + similarity ranking for a sample query
npm run spike:hnsw         # HNSW kNN, filter callback, edge cases, save/load round trip
```
