import Database from "better-sqlite3";

export type Db = Database.Database;

const schema = `
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY,           -- internal id, also the HNSW label
    sku         TEXT    NOT NULL UNIQUE,       -- stable business key from the catalog
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0)
  );
  CREATE INDEX IF NOT EXISTS idx_products_category_price ON products (category, price_cents);
`;

/** Opens (or creates) the database and applies the schema. Use ":memory:" in tests. */
export function openDatabase(file: string): Db {
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(schema);
  return db;
}
