import { openDatabase } from "../../src/db/database.js";
import { type NewProduct, ProductRepository } from "../../src/db/productRepository.js";

/** Small catalog with deliberate price boundaries (two products at exactly 20.00). */
export const fixtureProducts: NewProduct[] = [
  { sku: "OUT-001", name: "Steel Thermos", description: "Insulated flask that keeps coffee hot outdoors", category: "Outdoors", priceCents: 3000 },
  { sku: "OUT-002", name: "Camping Lantern", description: "Bright lantern for the tent at night", category: "Outdoors", priceCents: 2000 },
  { sku: "KIT-001", name: "Travel Mug", description: "Insulated mug that keeps coffee hot on the commute", category: "Kitchen", priceCents: 2000 },
  { sku: "KIT-002", name: "Chef Knife", description: "Sharp steel knife for chopping vegetables", category: "Kitchen", priceCents: 4999 },
  { sku: "ELE-001", name: "Headphones", description: "Noise cancelling headphones for travel", category: "Electronics", priceCents: 15000 },
  { sku: "ELE-002", name: "Mouse Pad", description: "Large desk mat for a gaming mouse", category: "Electronics", priceCents: 1000 },
];

export function createFixtureRepo(products: NewProduct[] = fixtureProducts): ProductRepository {
  const repo = new ProductRepository(openDatabase(":memory:"));
  repo.syncCatalog(products);
  return repo;
}

export const skus = (items: { sku: string }[]) => items.map((p) => p.sku);
