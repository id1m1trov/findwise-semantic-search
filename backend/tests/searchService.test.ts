// Search pipeline tests (filter -> rank -> load) with the fake embedder.
import { describe, expect, it } from "vitest";
import { SearchService } from "../src/search/searchService.js";
import { buildIndex } from "../src/vector/indexManager.js";
import { fixedIndex } from "../src/vector/syncedIndex.js";
import { FakeEmbedder } from "./helpers/fakeEmbedder.js";
import { createFixtureRepo, skus } from "./helpers/fixtures.js";

async function createService(thresholds = { minSimilarity: 0.3, strongSimilarity: 0.6 }) {
  const repo = createFixtureRepo();
  const embedder = new FakeEmbedder();
  const index = fixedIndex(await buildIndex(repo.listAll(), embedder));
  return new SearchService({ repo, embedder, index, ...thresholds });
}

const productSkus = (hits: { product: { sku: string } }[]) => skus(hits.map((h) => h.product));

describe("SearchService", () => {
  it("ranks matching products by similarity", async () => {
    const service = await createService();
    const { hits, meta } = await service.search({ query: "insulated flask keeps coffee hot", filters: {}, limit: 10 });
    expect(productSkus(hits).slice(0, 2)).toEqual(["OUT-001", "KIT-001"]);
    expect(hits[0].similarity).toBeGreaterThan(hits[1].similarity!);
    expect(meta).toMatchObject({ mode: "semantic", outcome: "results", matchingFilters: 6 });
  });

  it("only ranks products that pass the filters", async () => {
    const service = await createService();
    const { hits, meta } = await service.search({ query: "insulated flask keeps coffee hot", filters: { category: "Kitchen" }, limit: 10 });
    expect(productSkus(hits)).toEqual(["KIT-001"]);
    expect(meta.matchingFilters).toBe(2);
  });

  it("reports no_filter_matches when the filters exclude everything", async () => {
    const service = await createService();
    const { hits, meta } = await service.search({ query: "headphones", filters: { category: "Electronics", maxPriceCents: 500 }, limit: 10 });
    expect(hits).toEqual([]);
    expect(meta).toMatchObject({ outcome: "no_filter_matches", matchingFilters: 0 });
  });

  it("reports no_relevant_matches instead of returning weak matches", async () => {
    const service = await createService();
    const { hits, meta } = await service.search({ query: "spaceship engine parts", filters: {}, limit: 10 });
    expect(hits).toEqual([]);
    expect(meta).toMatchObject({ outcome: "no_relevant_matches", matchingFilters: 6, relevantCount: 0 });
  });

  it("lists filtered products alphabetically without scores when the query is empty", async () => {
    const service = await createService();
    const { hits, meta } = await service.search({ query: "   ", filters: { category: "Outdoors" }, limit: 10 });
    expect(productSkus(hits)).toEqual(["OUT-002", "OUT-001"]);
    expect(hits.every((h) => h.similarity === null && h.relevance === null)).toBe(true);
    expect(meta).toMatchObject({ mode: "browse", outcome: "results", matchingFilters: 2 });
  });

  it("reports no_filter_matches when browsing with filters that match nothing", async () => {
    const service = await createService();
    const { meta } = await service.search({ query: "", filters: { maxPriceCents: 1 }, limit: 10 });
    expect(meta).toMatchObject({ mode: "browse", outcome: "no_filter_matches" });
  });

  it("respects the limit but still counts every relevant product", async () => {
    const service = await createService({ minSimilarity: 0.1, strongSimilarity: 0.6 });
    const { hits, meta } = await service.search({ query: "insulated coffee hot", filters: {}, limit: 1 });
    expect(hits).toHaveLength(1);
    expect(meta.relevantCount).toBeGreaterThan(1);
  });

  it("labels results as strong or good using the similarity bands", async () => {
    const service = await createService({ minSimilarity: 0.1, strongSimilarity: 0.6 });
    const { hits } = await service.search({ query: "insulated flask keeps coffee hot outdoors", filters: {}, limit: 10 });
    for (const hit of hits) expect(hit.relevance).toBe(hit.similarity! >= 0.6 ? "strong" : "good");
    expect(hits[0].relevance).toBe("strong");
  });
});
