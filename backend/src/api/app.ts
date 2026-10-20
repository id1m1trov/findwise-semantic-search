import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { toCents } from "../catalog/catalog.js";
import type { ProductRepository } from "../db/productRepository.js";
import type { SearchHit, SearchService } from "../search/searchService.js";

export interface AppDependencies {
  repo: ProductRepository;
  searchService: SearchService;
}

// Query-string values arrive as strings; "" (an empty form field) means "not set".
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);
const price = z.preprocess(emptyToUndefined, z.coerce.number().finite().min(0).optional());

const searchQuerySchema = z
  .object({
    q: z.string().trim().max(200).default(""),
    category: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
    minPrice: price,
    maxPrice: price,
    limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(50).default(10)),
  })
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    message: "minPrice must not be greater than maxPrice",
    path: ["minPrice"],
  });

/** Public shape of a product: SKU instead of the internal id, price in euros. */
const toApiResult = ({ product, similarity, relevance }: SearchHit) => ({
  sku: product.sku,
  name: product.name,
  description: product.description,
  category: product.category,
  price: product.priceCents / 100,
  similarity,
  relevance,
});

export function createApp({ repo, searchService }: AppDependencies) {
  const app = express();
  app.disable("x-powered-by");

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", products: repo.count() });
  });

  app.get("/api/categories", (_req, res) => {
    res.json({ categories: repo.listCategories() });
  });

  app.get("/api/search", async (req, res) => {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid search parameters",
        details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
      return;
    }
    const { q, category, minPrice, maxPrice, limit } = parsed.data;
    if (category !== undefined && !repo.listCategories().includes(category)) {
      res.status(400).json({ error: "Invalid search parameters", details: [{ field: "category", message: `Unknown category "${category}"` }] });
      return;
    }

    const { hits, meta } = await searchService.search({
      query: q,
      filters: {
        category,
        minPriceCents: minPrice === undefined ? undefined : toCents(minPrice),
        maxPriceCents: maxPrice === undefined ? undefined : toCents(maxPrice),
      },
      limit,
    });
    res.json({ results: hits.map(toApiResult), meta });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Express 5 forwards rejected promises from async handlers here.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[api] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
