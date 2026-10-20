// HTTP layer tests: validation, response shape and error handling.
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { SearchService } from "../src/search/searchService.js";
import { buildIndex } from "../src/vector/indexManager.js";
import { FakeEmbedder } from "./helpers/fakeEmbedder.js";
import { createFixtureRepo } from "./helpers/fixtures.js";

const repo = createFixtureRepo();
const embedder = new FakeEmbedder();
const searchService = new SearchService({
  repo,
  embedder,
  index: await buildIndex(repo.listAll(), embedder),
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
