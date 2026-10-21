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

/** Category and price filters. Prices are whole cents; both limits are inclusive. */
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

/** All SQL lives here. User input is always passed as a parameter, never pasted into the SQL. */
export class ProductRepository {
  constructor(private readonly db: Db) {}

  /**
   * A counter SQLite changes whenever *another* connection writes, for example `npm run ingest`
   * while the server runs. It's cheap to read, so it can be checked before every search.
   */
  dataVersion(): number {
    return this.db.pragma("data_version", { simple: true }) as number;
  }

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

  /** Ids of every product that passes the filters. Vector search only ranks these. */
  findIds(filters: ProductFilters): number[] {
    const { where, params } = buildWhere(filters);
    const rows = this.db.prepare(`SELECT id FROM products ${where}`).all(params) as { id: number }[];
    return rows.map((r) => r.id);
  }

  /** Filtered products in alphabetical order, used when the search text is empty. */
  findByFilters(filters: ProductFilters, limit: number): Product[] {
    const { where, params } = buildWhere(filters);
    const rows = this.db
      .prepare(`SELECT * FROM products ${where} ORDER BY name LIMIT @limit`)
      .all({ ...params, limit }) as ProductRow[];
    return rows.map(toProduct);
  }

  /** Loads products by id, in the same order as `ids` (the ranking). Unknown ids are skipped. */
  getByIds(ids: number[]): Product[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(", ");
    const rows = this.db.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`).all(ids) as ProductRow[];
    const byId = new Map(rows.map((r) => [r.id, toProduct(r)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  /**
   * Makes the table match the catalog, matching products by SKU: adds new ones, updates changed
   * ones and deletes ones that are no longer in the catalog. Existing products keep their id.
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
