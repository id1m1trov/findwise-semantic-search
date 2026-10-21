// Ingestion: products.json -> SQLite (by SKU) -> vector index (rebuilt only if something changed).
import { mkdirSync } from "node:fs";
import { loadCatalog } from "../src/catalog/catalog.js";
import { config } from "../src/config.js";
import { openDatabase } from "../src/db/database.js";
import { ProductRepository } from "../src/db/productRepository.js";
import { TransformersEmbedder } from "../src/embeddings/embedder.js";
import { ensureIndex } from "../src/vector/indexManager.js";

mkdirSync(config.generatedDir, { recursive: true });
const repo = new ProductRepository(openDatabase(config.databaseFile));

const stats = repo.syncCatalog(loadCatalog(config.catalogFile));
console.log(
  `SQLite: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.deleted} deleted, ${stats.unchanged} unchanged`,
);

const { index, rebuilt, reason } = await ensureIndex({
  repo,
  embedder: new TransformersEmbedder(config.embeddingModel, config.embeddingDimension, config.modelCacheDir),
  indexFile: config.indexFile,
  metaFile: config.indexMetaFile,
});
console.log(`Vector index: ${rebuilt ? "rebuilt" : "unchanged"} (${index.size} vectors): ${reason}`);
