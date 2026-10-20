import { createHash } from "node:crypto";
import type { Product } from "../db/productRepository.js";

/**
 * The exact text that gets embedded for a product. Changing this recipe changes every
 * content hash, so the index fingerprint changes and the index is rebuilt automatically.
 */
export function embeddingText(product: Pick<Product, "name" | "description">): string {
  return `${product.name}. ${product.description}`;
}

/** SHA-256 of the embedded text: changes whenever the text the vector was built from changes. */
export function contentHash(product: Pick<Product, "name" | "description">): string {
  return createHash("sha256").update(embeddingText(product)).digest("hex");
}
