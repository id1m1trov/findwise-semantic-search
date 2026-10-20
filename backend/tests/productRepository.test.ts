// Filter tests: SQL only, no embeddings. If these fail, the problem is in the structured filtering.
import { describe, expect, it } from "vitest";
import { createFixtureRepo, fixtureProducts, skus } from "./helpers/fixtures.js";

const skusFor = (repo: ReturnType<typeof createFixtureRepo>, ids: number[]) => skus(repo.getByIds(ids)).sort();

describe("ProductRepository filters", () => {
  const repo = createFixtureRepo();

  it("returns every product when no filters are set", () => {
    expect(repo.findIds({})).toHaveLength(fixtureProducts.length);
  });

  it("filters by category", () => {
    expect(skusFor(repo, repo.findIds({ category: "Kitchen" }))).toEqual(["KIT-001", "KIT-002"]);
  });

  it("treats price bounds as inclusive", () => {
    const ids = repo.findIds({ minPriceCents: 2000, maxPriceCents: 3000 });
    expect(skusFor(repo, ids)).toEqual(["KIT-001", "OUT-001", "OUT-002"]);
  });

  it("combines category and price filters", () => {
    expect(skusFor(repo, repo.findIds({ category: "Kitchen", maxPriceCents: 2000 }))).toEqual(["KIT-001"]);
  });

  it("returns nothing when the filters exclude every product", () => {
    expect(repo.findIds({ category: "Electronics", maxPriceCents: 500 })).toEqual([]);
  });

  it("returns nothing for an unknown category", () => {
    expect(repo.findIds({ category: "Garden" })).toEqual([]);
  });

  it("lists filtered products alphabetically for browsing", () => {
    expect(skus(repo.findByFilters({ category: "Outdoors" }, 10))).toEqual(["OUT-002", "OUT-001"]); // Camping…, Steel…
    expect(repo.findByFilters({}, 2)).toHaveLength(2);
  });

  it("loads products by id in the requested order and skips unknown ids", () => {
    const [a, b] = repo.findIds({ category: "Kitchen" });
    expect(repo.getByIds([b, 9999, a]).map((p) => p.id)).toEqual([b, a]);
  });

  it("lists distinct categories alphabetically", () => {
    expect(repo.listCategories()).toEqual(["Electronics", "Kitchen", "Outdoors"]);
  });
});

describe("ProductRepository.syncCatalog", () => {
  it("inserts, updates, deletes by SKU and keeps ids stable", () => {
    const repo = createFixtureRepo();
    const idBefore = repo.listAll().find((p) => p.sku === "KIT-001")!.id;

    const next = fixtureProducts
      .filter((p) => p.sku !== "ELE-002") // deleted
      .map((p) => (p.sku === "KIT-001" ? { ...p, description: "Now with a leak-proof lid" } : p)) // updated
      .concat({ sku: "FIT-001", name: "Yoga Mat", description: "Grippy mat", category: "Fitness", priceCents: 3400 }); // inserted

    expect(repo.syncCatalog(next)).toEqual({ inserted: 1, updated: 1, deleted: 1, unchanged: 4 });
    const mug = repo.listAll().find((p) => p.sku === "KIT-001")!;
    expect(mug.id).toBe(idBefore);
    expect(mug.description).toBe("Now with a leak-proof lid");
    expect(skus(repo.listAll())).not.toContain("ELE-002");
  });

  it("reports everything unchanged when the catalog is synced twice", () => {
    const repo = createFixtureRepo();
    expect(repo.syncCatalog(fixtureProducts)).toEqual({ inserted: 0, updated: 0, deleted: 0, unchanged: 6 });
  });
});
