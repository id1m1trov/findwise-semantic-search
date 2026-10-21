import { createHash } from "node:crypto";
import type { Product } from "../db/productRepository.js";

/**
 * The exact text that gets turned into a product's vector. If you change it, every product's
 * hash changes, so the index is rebuilt automatically on the next start.
 */
export function embeddingText(product: Pick<Product, "name" | "description">): string {
  return `${product.name}. ${product.description}`;
}

/** A hash of the embedded text. It changes whenever the text behind the vector changes. */
export function contentHash(product: Pick<Product, "name" | "description">): string {
  return createHash("sha256").update(embeddingText(product)).digest("hex");
}
