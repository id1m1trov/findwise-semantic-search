// Staleness checks: the index must be rebuilt exactly when SQLite or the model changed.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ensureIndex } from "../src/vector/indexManager.js";
import { FakeEmbedder } from "./helpers/fakeEmbedder.js";
import { createFixtureRepo, fixtureProducts } from "./helpers/fixtures.js";

describe("ensureIndex", () => {
  let dir: string;
  let files: { indexFile: string; metaFile: string };

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "index-manager-"));
    files = { indexFile: path.join(dir, "p.hnsw"), metaFile: path.join(dir, "p.hnsw.meta.json") };
  });

  /** Builds once, then runs `change` and returns the result of the second ensureIndex call. */
  async function rerunAfter(change: (repo: ReturnType<typeof createFixtureRepo>) => void, embedder = new FakeEmbedder()) {
    const repo = createFixtureRepo();
    await ensureIndex({ repo, embedder: new FakeEmbedder(), ...files });
    change(repo);
    return ensureIndex({ repo, embedder, ...files });
  }

  it("builds the index on first run", async () => {
    const result = await ensureIndex({ repo: createFixtureRepo(), embedder: new FakeEmbedder(), ...files });
    expect(result.rebuilt).toBe(true);
    expect(result.index.size).toBe(fixtureProducts.length);
  });

  it("loads the saved index without embedding anything when nothing changed", async () => {
    const embedder = new FakeEmbedder();
    const result = await rerunAfter(() => {}, embedder);
    expect(result.rebuilt).toBe(false);
    expect(embedder.calls).toBe(0);
  });

  it("does not rebuild when only the price changes (price is not embedded)", async () => {
    const result = await rerunAfter((repo) =>
      repo.syncCatalog(fixtureProducts.map((p) => (p.sku === "KIT-001" ? { ...p, priceCents: 1 } : p))),
    );
    expect(result.rebuilt).toBe(false);
  });

  it.each([
    ["a description is edited", (p: typeof fixtureProducts) => p.map((x) => (x.sku === "KIT-001" ? { ...x, description: "Changed" } : x))],
    ["a name is edited", (p: typeof fixtureProducts) => p.map((x) => (x.sku === "KIT-001" ? { ...x, name: "Changed" } : x))],
    ["a product is deleted", (p: typeof fixtureProducts) => p.filter((x) => x.sku !== "ELE-002")],
    ["a product is added", (p: typeof fixtureProducts) => [...p, { ...p[0], sku: "NEW-001" }]],
  ])("rebuilds when %s", async (_label, edit) => {
    const result = await rerunAfter((repo) => repo.syncCatalog(edit(fixtureProducts)));
    expect(result.rebuilt).toBe(true);
    expect(result.reason).toMatch(/changed/);
  });

  it("rebuilds when the embedding model changes", async () => {
    const result = await rerunAfter(() => {}, new FakeEmbedder("another-model"));
    expect(result.rebuilt).toBe(true);
  });

  it("rebuilds when the metadata file is corrupt", async () => {
    const result = await rerunAfter(() => writeFileSync(files.metaFile, "{ not json"));
    expect(result.rebuilt).toBe(true);
    expect(result.reason).toMatch(/no readable index/);
  });

  it("rebuilds when the index file is missing", async () => {
    const result = await rerunAfter(() => rmSync(files.indexFile));
    expect(result.rebuilt).toBe(true);
  });
});
