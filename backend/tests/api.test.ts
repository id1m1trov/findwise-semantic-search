// HTTP layer tests: validation, response shape and error handling.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { SearchService } from "../src/search/searchService.js";
import { buildIndex } from "../src/vector/indexManager.js";
import { fixedIndex } from "../src/vector/syncedIndex.js";
import { FakeEmbedder } from "./helpers/fakeEmbedder.js";
import { createFixtureRepo } from "./helpers/fixtures.js";

const repo = createFixtureRepo();
const embedder = new FakeEmbedder();
const searchService = new SearchService({
  repo,
  embedder,
  index: fixedIndex(await buildIndex(repo.listAll(), embedder)),
  minSimilarity: 0.3,
  strongSimilarity: 0.6,
});
const app = createApp({ repo, searchService });

describe("GET /api/search", () => {
  it("returns results with public fields only (SKU, price in euros)", async () => {
    const res = await request(app).get("/api/search").query({ q: "insulated flask keeps coffee hot" });
    expect(res.status).toBe(200);
    expect(res.body.results[0]).toEqual({
      sku: "OUT-001",
      name: "Steel Thermos",
      description: "Insulated flask that keeps coffee hot outdoors",
      category: "Outdoors",
      price: 30,
      similarity: expect.any(Number),
      relevance: expect.stringMatching(/strong|good/),
    });
    expect(res.body.results[0]).not.toHaveProperty("id");
    expect(res.body.meta).toMatchObject({ mode: "semantic", outcome: "results" });
  });

  it("converts euro price filters to cents (inclusive)", async () => {
    const res = await request(app).get("/api/search").query({ q: "", minPrice: "20", maxPrice: "20.00" });
    expect(res.body.results.map((r: { sku: string }) => r.sku).sort()).toEqual(["KIT-001", "OUT-002"]);
  });

  it("never widens a price bound when rounding to cents", async () => {
    const skusFor = async (query: Record<string, string>) =>
      (await request(app).get("/api/search").query(query)).body.results.map((r: { sku: string }) => r.sku).sort();
    expect(await skusFor({ maxPrice: "19.999" })).toEqual(["ELE-002"]); // the 20.00 products stay out
    expect(await skusFor({ minPrice: "149.999" })).toEqual(["ELE-001"]); // 150.00 is inside
    expect(await skusFor({ minPrice: "150.001" })).toEqual([]);
  });

  it("browses everything when the query is only whitespace and no filters are set", async () => {
    const res = await request(app).get("/api/search").query({ q: "   " });
    expect(res.body.meta).toMatchObject({ mode: "browse", matchingFilters: 6 });
  });

  it("treats SQL in parameters as plain text", async () => {
    const res = await request(app).get("/api/search").query({ category: "Home'; DROP TABLE products;--" });
    expect(res.status).toBe(400);
    const semantic = await request(app).get("/api/search").query({ q: "x' OR 1=1--" });
    expect(semantic.status).toBe(200);
    expect(repo.count()).toBe(6); // table untouched
  });

  it("rejects a parameter given more than once", async () => {
    const res = await request(app).get("/api/search?q=mug&q=lamp");
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe("q");
  });

  it("explains non-numeric prices in plain words", async () => {
    const res = await request(app).get("/api/search").query({ maxPrice: "20,50" });
    expect(res.body.details).toEqual([{ field: "maxPrice", message: "must be a number" }]);
  });

  it("treats empty form fields as not set", async () => {
    const res = await request(app).get("/api/search").query({ q: "", category: "", minPrice: "", maxPrice: "", limit: "" });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(6);
  });

  it.each([
    [{ limit: "0" }, "limit"],
    [{ limit: "51" }, "limit"],
    [{ minPrice: "abc" }, "minPrice"],
    [{ minPrice: "-1" }, "minPrice"],
    [{ minPrice: "50", maxPrice: "10" }, "minPrice"],
    [{ q: "x".repeat(201) }, "q"],
    [{ category: "Garden" }, "category"],
  ])("rejects invalid parameters %j with 400", async (query, field) => {
    const res = await request(app).get("/api/search").query(query);
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { field: string }) => d.field)).toContain(field);
  });

  it("returns 500 without leaking details when search throws", async () => {
    const failing = { search: async () => Promise.reject(new Error("secret internals")) } as unknown as SearchService;
    const res = await request(createApp({ repo, searchService: failing })).get("/api/search").query({ q: "mug" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });
});

describe("other routes", () => {
  it("GET /api/health reports the product count", async () => {
    expect((await request(app).get("/api/health")).body).toEqual({ status: "ok", products: 6 });
  });

  it("GET /api/categories lists categories", async () => {
    expect((await request(app).get("/api/categories")).body).toEqual({ categories: ["Electronics", "Kitchen", "Outdoors"] });
  });

  it("returns JSON 404 for unknown API routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });
});

describe("serving the frontend build", () => {
  const distDir = mkdtempSync(path.join(tmpdir(), "frontend-dist-"));
  mkdirSync(path.join(distDir, "assets"));
  writeFileSync(path.join(distDir, "index.html"), "<!doctype html><title>Marlow</title>");
  writeFileSync(path.join(distDir, "assets", "index-abc123.js"), "console.log('app')");
  const site = createApp({ repo, searchService, staticDir: distDir });
  afterAll(() => rmSync(distDir, { recursive: true, force: true }));

  it("serves index.html at / without long caching", async () => {
    const res = await request(site).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<title>Marlow</title>");
    expect(res.headers["cache-control"]).toBe("no-cache");
  });

  it("caches hashed assets for a year", async () => {
    const res = await request(site).get("/assets/index-abc123.js");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
  });

  it("falls back to index.html for other page paths", async () => {
    const res = await request(site).get("/some/page");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<title>Marlow</title>");
  });

  it("returns 404 for missing files instead of the page", async () => {
    expect((await request(site).get("/assets/missing.js")).status).toBe(404);
  });

  it("keeps the API and its JSON 404", async () => {
    expect((await request(site).get("/api/health")).body).toEqual({ status: "ok", products: 6 });
    const res = await request(site).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("serves no pages when no build folder is given", async () => {
    expect((await request(app).get("/")).status).toBe(404);
  });
});
