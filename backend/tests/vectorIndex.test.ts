// Vector index tests with hand-made vectors: no model, fully predictable.
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { VectorIndex } from "../src/vector/vectorIndex.js";

// Ids 10/20/30 point along x, y and between x and y; id 40 points along z.
const items = [
  { id: 10, vector: [1, 0, 0] },
  { id: 20, vector: [0, 1, 0] },
  { id: 30, vector: [0.7, 0.7, 0] },
  { id: 40, vector: [0, 0, 1] },
];
const query = [1, 0.1, 0]; // close to 10, then 30

describe("VectorIndex", () => {
  const index = VectorIndex.build(3, items);

  it("returns nearest neighbours first with cosine similarity", () => {
    const hits = index.search(query, 4);
    expect(hits.map((h) => h.id)).toEqual([10, 30, 20, 40]);
    expect(hits[0].similarity).toBeCloseTo(0.995, 2);
    expect(hits[3].similarity).toBeCloseTo(0, 5);
  });

  it("only returns allowed ids when a filter is given", () => {
    expect(index.search(query, 4, new Set([20, 40])).map((h) => h.id)).toEqual([20, 40]);
  });

  it("returns what exists when k exceeds the allowed ids or the index size", () => {
    expect(index.search(query, 10, new Set([30]))).toHaveLength(1);
    expect(index.search(query, 100)).toHaveLength(4);
  });

  it("returns nothing for an empty allowed set", () => {
    expect(index.search(query, 4, new Set())).toEqual([]);
  });

  it("accepts typed arrays (converted internally)", () => {
    expect(index.search(Array.from(Float32Array.from(query)), 1)[0].id).toBe(10);
  });

  it("rejects vectors with the wrong dimension", () => {
    expect(() => VectorIndex.build(3, [{ id: 1, vector: [1, 0] }])).toThrow(/dimensions/);
  });

  it("saves atomically and loads back identical results", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "vector-index-"));
    const file = path.join(dir, "test.hnsw");
    index.save(file);
    expect(readdirSync(dir)).toEqual(["test.hnsw"]); // no temp file left behind
    const loaded = VectorIndex.load(file, 3);
    expect(loaded.size).toBe(4);
    expect(loaded.search(query, 4)).toEqual(index.search(query, 4));
  });
});
