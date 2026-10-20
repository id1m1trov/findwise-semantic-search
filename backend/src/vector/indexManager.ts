import { createHash } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import type { Product, ProductRepository } from "../db/productRepository.js";
import type { Embedder } from "../embeddings/embedder.js";
import { contentHash, embeddingText } from "../embeddings/embeddingText.js";
import { VectorIndex } from "./vectorIndex.js";

/** Saved next to the index file; describes exactly what the index was built from. */
export interface IndexMeta {
  fingerprint: string;
  model: string;
  dimension: number;
  count: number;
  builtAt: string;
}

export interface EnsureIndexResult {
  index: VectorIndex;
  rebuilt: boolean;
  reason: string;
}

/**
 * One hash describing the whole index: every (id, content hash) pair plus the model and
 * dimension. Any added, deleted or edited product, a changed embedding recipe or a different
 * model produces a different fingerprint.
 */
export function computeFingerprint(products: Product[], model: string, dimension: number): string {
  const items = [...products].sort((a, b) => a.id - b.id).map((p) => [p.id, contentHash(p)]);
  return createHash("sha256").update(JSON.stringify({ model, dimension, items })).digest("hex");
}

export async function buildIndex(products: Product[], embedder: Embedder): Promise<VectorIndex> {
  const vectors = await embedder.embed(products.map(embeddingText));
  return VectorIndex.build(
    embedder.dimension,
    products.map((p, i) => ({ id: p.id, vector: vectors[i] })),
  );
}

/**
 * Loads the saved index if it still matches SQLite (the source of truth); otherwise rebuilds
 * it from SQLite and saves it. Safe to call on every startup.
 */
export async function ensureIndex(options: {
  repo: ProductRepository;
  embedder: Embedder;
  indexFile: string;
  metaFile: string;
}): Promise<EnsureIndexResult> {
  const { repo, embedder, indexFile, metaFile } = options;
  const products = repo.listAll();
  const fingerprint = computeFingerprint(products, embedder.modelName, embedder.dimension);

  let reason: string;
  try {
    const meta = JSON.parse(readFileSync(metaFile, "utf-8")) as IndexMeta;
    if (meta.fingerprint !== fingerprint) {
      reason = "catalog or model changed since the index was built";
    } else {
      const index = VectorIndex.load(indexFile, embedder.dimension);
      if (index.size === products.length) return { index, rebuilt: false, reason: "index is up to date" };
      reason = "index file does not match its metadata";
    }
  } catch {
    reason = "no readable index found";
  }

  const index = await buildIndex(products, embedder);
  index.save(indexFile);
  const meta: IndexMeta = {
    fingerprint,
    model: embedder.modelName,
    dimension: embedder.dimension,
    count: products.length,
    builtAt: new Date().toISOString(),
  };
  // Metadata is written last: if we crash before this, the old fingerprint no longer
  // matches and the next start simply rebuilds again.
  writeFileSync(`${metaFile}.tmp`, JSON.stringify(meta, null, 2));
  renameSync(`${metaFile}.tmp`, metaFile);
  return { index, rebuilt: true, reason };
}
