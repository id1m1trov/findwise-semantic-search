// End-to-end with the real MiniLM model and the real 72-product catalog (slower: loads the model).
import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../../src/catalog/catalog.js";
import { config } from "../../src/config.js";
import { TransformersEmbedder } from "../../src/embeddings/embedder.js";
import { SearchService } from "../../src/search/searchService.js";
import { buildIndex } from "../../src/vector/indexManager.js";
import { createFixtureRepo } from "../helpers/fixtures.js";

describe("semantic search with the real model", () => {
  let service: SearchService;

  beforeAll(async () => {
    const repo = createFixtureRepo(loadCatalog(config.catalogFile));
    const embedder = new TransformersEmbedder(config.embeddingModel, config.embeddingDimension);
    service = new SearchService({
      repo,
      embedder,
      index: await buildIndex(repo.listAll(), embedder),
      minSimilarity: config.minSimilarity,
      strongSimilarity: config.strongSimilarity,
    });
  });

  const top = async (query: string, filters = {}) =>
    (await service.search({ query, filters, limit: 3 })).hits.map((h) => h.product.sku);

  it("finds the thermos for the brief's example query without keyword overlap", async () => {
    expect(await top("something to keep my drink hot on a camping trip")).toContain("OUT-001");
  });

  it("respects the category filter even when the best overall match is excluded", async () => {
    const skus = await top("keep my drink hot", { category: "Kitchen & Drinkware" });
    expect(skus[0]).toBe("KIT-001");
  });

  it("returns nothing for an unrelated query", async () => {
    expect(await top("spaceship engine parts")).toEqual([]);
  });
});
