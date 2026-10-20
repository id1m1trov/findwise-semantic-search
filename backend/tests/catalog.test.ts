// Validates the catalog parser and the real dataset files.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadCatalog, maxPriceToCents, minPriceToCents, parseCatalog, toCents } from "../src/catalog/catalog.js";
import { config } from "../src/config.js";

const valid = { sku: "ABC-001", name: "Mug", description: "A mug", category: "Kitchen", price: 9.5 };

describe("parseCatalog", () => {
  it("converts euros to integer cents without float noise", () => {
    expect(toCents(19.9)).toBe(1990); // 19.9 * 100 = 1989.9999999999998 in floating point
    expect(parseCatalog([valid])[0].priceCents).toBe(950);
  });

  it("rounds price filter bounds inwards so a bound is never widened", () => {
    expect(maxPriceToCents(9.499)).toBe(949); // must exclude a 9.50 product
    expect(minPriceToCents(9.501)).toBe(951); // must exclude a 9.50 product
    expect(maxPriceToCents(19.9)).toBe(1990); // float noise does not lose a cent
    expect(minPriceToCents(19.9)).toBe(1990);
    expect(maxPriceToCents(20)).toBe(2000);
  });

  it("rejects duplicate SKUs, malformed SKUs and negative prices", () => {
    expect(() => parseCatalog([valid, valid])).toThrow(/Duplicate SKU/);
    expect(() => parseCatalog([{ ...valid, sku: "abc1" }])).toThrow();
    expect(() => parseCatalog([{ ...valid, price: -1 }])).toThrow();
    expect(() => parseCatalog([{ ...valid, name: "" }])).toThrow();
  });
});

describe("dataset files", () => {
  const products = loadCatalog(config.catalogFile);

  it("has 72 products, 12 in each of 6 categories", () => {
    expect(products).toHaveLength(72);
    const perCategory = new Map<string, number>();
    for (const p of products) perCategory.set(p.category, (perCategory.get(p.category) ?? 0) + 1);
    expect(perCategory.size).toBe(6);
    expect([...perCategory.values()]).toEqual([12, 12, 12, 12, 12, 12]);
  });

  it("only references existing SKUs and categories in the eval queries", () => {
    const eval_ = JSON.parse(readFileSync(config.catalogFile.replace("products.json", "evalQueries.json"), "utf-8"));
    const known = new Set(products.map((p) => p.sku));
    const categories = new Set(products.map((p) => p.category));
    const cases = [...eval_.semantic, ...eval_.combined, ...eval_.noResults, ...eval_.heldOut];
    for (const c of cases) {
      for (const sku of [...(c.relevant ?? []), ...(c.mustNotInTop3 ?? [])]) expect(known, `${c.query}: ${sku}`).toContain(sku);
      if (c.filters?.category) expect(categories).toContain(c.filters.category);
    }
  });
});
