import type { Db } from "./database.js";

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
}

export type NewProduct = Omit<Product, "id">;

/** Structured filters. Prices are integer cents; bounds are inclusive. */
export interface ProductFilters {
  category?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
}

export interface SyncStats {
  inserted: number;
  updated: number;
  deleted: number;
  unchanged: number;
}

interface ProductRow {
  id: number;
  sku: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
}

const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  sku: row.sku,
  name: row.name,
  description: row.description,
  category: row.category,
  priceCents: row.price_cents,
});

/** All SQL lives here. Everything is parameterised; no user input is concatenated into SQL. */
export class ProductRepository {
  constructor(private readonly db: Db) {}

  count(): number {
    return (this.db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number }).n;
  }

  listAll(): Product[] {
    return (this.db.prepare("SELECT * FROM products ORDER BY id").all() as ProductRow[]).map(toProduct);
  }

  listCategories(): string[] {
    const rows = this.db.prepare("SELECT DISTINCT category FROM products ORDER BY category").all();
    return (rows as { category: string }[]).map((r) => r.category);
  }

  /** Ids of every product matching the filters: the candidate set for vector search. */
  findIds(filters: ProductFilters): number[] {
    const { where, params } = buildWhere(filters);
    const rows = this.db.prepare(`SELECT id FROM products ${where}`).all(params) as { id: number }[];
    return rows.map((r) => r.id);
  }

  /** Plain filtered listing (used when the query is empty), alphabetical. */
  findByFilters(filters: ProductFilters, limit: number): Product[] {
    const { where, params } = buildWhere(filters);
    const rows = this.db
      .prepare(`SELECT * FROM products ${where} ORDER BY name LIMIT @limit`)
      .all({ ...params, limit }) as ProductRow[];
    return rows.map(toProduct);
  }

  /** Loads products by id, preserving the order of `ids` (the ranking). Unknown ids are skipped. */
  getByIds(ids: number[]): Product[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(", ");
    const rows = this.db.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`).all(ids) as ProductRow[];
    const byId = new Map(rows.map((r) => [r.id, toProduct(r)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  /**
   * Makes the table match the catalog, keyed by SKU: inserts new SKUs, updates changed ones
   * and deletes SKUs that are no longer in the catalog. Existing SKUs keep their id.
   */
  syncCatalog(products: NewProduct[]): SyncStats {
    const stats: SyncStats = { inserted: 0, updated: 0, deleted: 0, unchanged: 0 };
    const existing = new Map(this.listAll().map((p) => [p.sku, p]));
    const insert = this.db.prepare(
      `INSERT INTO products (sku, name, description, category, price_cents)
       VALUES (@sku, @name, @description, @category, @priceCents)`,
    );
    const update = this.db.prepare(
      `UPDATE products SET name = @name, description = @description, category = @category,
       price_cents = @priceCents WHERE sku = @sku`,
    );
    const remove = this.db.prepare("DELETE FROM products WHERE sku = ?");

    this.db.transaction(() => {
      for (const product of products) {
        const current = existing.get(product.sku);
        existing.delete(product.sku);
        if (!current) {
          insert.run(product);
          stats.inserted++;
        } else if (
          current.name !== product.name ||
          current.description !== product.description ||
          current.category !== product.category ||
          current.priceCents !== product.priceCents
        ) {
          update.run(product);
          stats.updated++;
        } else {
          stats.unchanged++;
        }
      }
      for (const sku of existing.keys()) {
        remove.run(sku);
        stats.deleted++;
      }
    })();

    return stats;
  }
}

function buildWhere(filters: ProductFilters): { where: string; params: Record<string, string | number> } {
  const clauses: string[] = [];
  const params: Record<string, string | number> = {};
  if (filters.category !== undefined) {
    clauses.push("category = @category");
    params.category = filters.category;
  }
  if (filters.minPriceCents !== undefined) {
    clauses.push("price_cents >= @minPriceCents");
    params.minPriceCents = filters.minPriceCents;
  }
  if (filters.maxPriceCents !== undefined) {
    clauses.push("price_cents <= @maxPriceCents");
    params.maxPriceCents = filters.maxPriceCents;
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}
