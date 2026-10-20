// The running server must follow database changes made by another process (e.g. `npm run ingest`).
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../src/db/database.js";
import { type NewProduct, ProductRepository } from "../src/db/productRepository.js";
import { SyncedIndex } from "../src/vector/syncedIndex.js";
import { FakeEmbedder } from "./helpers/fakeEmbedder.js";
import { fixtureProducts } from "./helpers/fixtures.js";

const newMug: NewProduct = { sku: "KIT-099", name: "Enamel Camp Mug", description: "Chip-resistant enamel mug", category: "Kitchen", priceCents: 1200 };

describe("SyncedIndex", () => {
  let files: { databaseFile: string; indexFile: string; metaFile: string };
  let ingest: ProductRepository; // second connection, like the ingest script
  let server: ProductRepository;
  let embedder: FakeEmbedder;

  const openServerIndex = () =>
    SyncedIndex.open({ repo: server, embedder, indexFile: files.indexFile, metaFile: files.metaFile });

  beforeEach(() => {
    const dir = mkdtempSync(path.join(tmpdir(), "synced-index-"));
    files = { databaseFile: path.join(dir, "p.db"), indexFile: path.join(dir, "p.hnsw"), metaFile: path.join(dir, "p.meta.json") };
    ingest = new ProductRepository(openDatabase(files.databaseFile));
    ingest.syncCatalog(fixtureProducts);
    server = new ProductRepository(openDatabase(files.databaseFile));
    embedder = new FakeEmbedder();
  });

  const idOf = (sku: string) => server.listAll().find((p) => p.sku === sku)!.id;

  it("returns the same index without re-embedding while nothing changes", async () => {
    const { index } = await openServerIndex();
    const first = await index.get();
    const calls = embedder.calls;
    expect(await index.get()).toBe(first);
    expect(embedder.calls).toBe(calls);
  });

  it("picks up a product added by another connection", async () => {
    const { index } = await openServerIndex();
    ingest.syncCatalog([...fixtureProducts, newMug]);
    const current = await index.get();
    expect(current.size).toBe(fixtureProducts.length + 1);
    const [query] = await embedder.embed(["Enamel Camp Mug. Chip-resistant enamel mug"]);
    expect(current.search(query, 1)[0].id).toBe(idOf("KIT-099"));
  });

  it("re-embeds a product whose description was edited", async () => {
    const { index } = await openServerIndex();
    const edited = fixtureProducts.map((p) => (p.sku === "ELE-002" ? { ...p, description: "Waterproof hiking boots" } : p));
    ingest.syncCatalog(edited);
    const [query] = await embedder.embed(["Mouse Pad. Waterproof hiking boots"]);
    expect((await index.get()).search(query, 1)[0]).toMatchObject({ id: idOf("ELE-002"), similarity: expect.closeTo(1, 5) });
  });

  it("drops a product deleted by another connection", async () => {
    const { index } = await openServerIndex();
    ingest.syncCatalog(fixtureProducts.filter((p) => p.sku !== "ELE-002"));
    expect((await index.get()).size).toBe(fixtureProducts.length - 1);
  });

  it("does not rebuild when only a price changes", async () => {
    const { index } = await openServerIndex();
    const calls = embedder.calls;
    ingest.syncCatalog(fixtureProducts.map((p) => ({ ...p, priceCents: p.priceCents + 1 })));
    await index.get();
    expect(embedder.calls).toBe(calls); // fingerprint unchanged: saved index reloaded, nothing embedded
  });

  it("runs a single refresh for concurrent searches", async () => {
    const { index } = await openServerIndex();
    ingest.syncCatalog([...fixtureProducts, newMug]);
    const calls = embedder.calls;
    const results = await Promise.all([index.get(), index.get(), index.get()]);
    expect(new Set(results).size).toBe(1);
    expect(embedder.calls).toBe(calls + 1);
  });

  it("is in sync after a restart when the database changed while the server was down", async () => {
    await openServerIndex(); // first run builds and saves the index
    ingest.syncCatalog([...fixtureProducts, newMug]); // changed while "down"
    server = new ProductRepository(openDatabase(files.databaseFile)); // restart
    const { index, rebuilt } = await openServerIndex();
    expect(rebuilt).toBe(true);
    expect(index.size).toBe(fixtureProducts.length + 1);
  });
});
