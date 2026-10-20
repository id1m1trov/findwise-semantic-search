import { mkdirSync } from "node:fs";
import { createApp } from "./api/app.js";
import { loadCatalog } from "./catalog/catalog.js";
import { config } from "./config.js";
import { openDatabase } from "./db/database.js";
import { ProductRepository } from "./db/productRepository.js";
import { TransformersEmbedder } from "./embeddings/embedder.js";
import { SearchService } from "./search/searchService.js";
import { SyncedIndex } from "./vector/syncedIndex.js";

mkdirSync(config.generatedDir, { recursive: true });
const repo = new ProductRepository(openDatabase(config.databaseFile));

// First run: seed SQLite from the catalog. Afterwards SQLite is the source of truth;
// re-import catalog changes explicitly with `npm run ingest`.
if (repo.count() === 0) {
  const stats = repo.syncCatalog(loadCatalog(config.catalogFile));
  console.log(`[startup] seeded database with ${stats.inserted} products`);
}

const embedder = new TransformersEmbedder(config.embeddingModel, config.embeddingDimension);
const { index, rebuilt, reason } = await SyncedIndex.open({
  repo,
  embedder,
  indexFile: config.indexFile,
  metaFile: config.indexMetaFile,
  log: console.log,
});
console.log(`[startup] vector index ${rebuilt ? "rebuilt" : "loaded"} (${index.size} vectors): ${reason}`);

await embedder.embed(["warm-up"]); // load the model now, not on the first user search

const searchService = new SearchService({
  repo,
  embedder,
  index,
  minSimilarity: config.minSimilarity,
  strongSimilarity: config.strongSimilarity,
});

createApp({ repo, searchService }).listen(config.port, () => {
  console.log(`[startup] backend listening on http://localhost:${config.port}`);
});
