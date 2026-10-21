import { readFileSync } from "node:fs";
import { z } from "zod";
import type { NewProduct } from "../db/productRepository.js";

const catalogProductSchema = z.object({
  sku: z.string().regex(/^[A-Z]{3}-\d{3}$/, "SKU must look like ABC-123"),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.string().trim().min(1),
  price: z.number().nonnegative(), // EUR, as written in the JSON
});

const catalogSchema = z.array(catalogProductSchema).superRefine((products, ctx) => {
  const seen = new Set<string>();
  products.forEach((p, i) => {
    if (seen.has(p.sku)) ctx.addIssue({ code: "custom", path: [i, "sku"], message: `Duplicate SKU ${p.sku}` });
    seen.add(p.sku);
  });
});

/** Euros to whole cents. Rounding fixes floating-point errors such as 19.9 * 100 = 1989.9999999999998. */
export const toCents = (euros: number): number => Math.round(euros * 100);

/**
 * Price limits in euros to whole cents, rounding *inwards* so a limit never gets wider:
 * a maximum of 9.499 must not include a 9.50 product. The tiny extra margin (1e-6) covers
 * floating-point errors, so 19.9 still becomes 1990.
 */
export const minPriceToCents = (euros: number) => Math.ceil(euros * 100 - 1e-6);
export const maxPriceToCents = (euros: number) => Math.floor(euros * 100 + 1e-6);

/** Validates raw catalog JSON and converts it to repository products. Throws on invalid data. */
export function parseCatalog(raw: unknown): NewProduct[] {
  return catalogSchema.parse(raw).map(({ price, ...rest }) => ({ ...rest, priceCents: toCents(price) }));
}

export function loadCatalog(file: string): NewProduct[] {
  return parseCatalog(JSON.parse(readFileSync(file, "utf-8")));
}
