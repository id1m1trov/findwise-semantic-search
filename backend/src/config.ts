import path from "node:path";
import { fileURLToPath } from "node:url";

// src/config.ts and dist/config.js are both one level below the backend root.
const backendRoot = fileURLToPath(new URL("..", import.meta.url));
const generatedDir = process.env.DATA_DIR ?? path.join(backendRoot, "data", "generated");

export const config = {
  port: Number(process.env.PORT ?? 3001),

  catalogFile: path.join(backendRoot, "data", "products.json"),
  generatedDir,
  databaseFile: path.join(generatedDir, "products.db"),
  indexFile: path.join(generatedDir, "products.hnsw"),
  indexMetaFile: path.join(generatedDir, "products.hnsw.meta.json"),
  // Downloaded model files; kept with the other generated files so a deploy build bundles them.
  modelCacheDir: path.join(generatedDir, "model-cache"),

  // The production frontend build, served by the backend when it exists.
  frontendDistDir: path.join(backendRoot, "..", "frontend", "dist"),

  embeddingModel: "Xenova/all-MiniLM-L6-v2",
  embeddingDimension: 384,

  // Cosine similarity cut-offs, calibrated with `npm run eval` (see README).
  minSimilarity: 0.3,
  strongSimilarity: 0.45,
} as const;
