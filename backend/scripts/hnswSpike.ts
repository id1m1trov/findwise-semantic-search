// Spike: verify hnswlib-node works end to end with real embeddings:
// plain kNN, filter callback (our SQL-prefilter design), edge cases, save/load.
// Throwaway code, not part of the app.
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import hnswlib from "hnswlib-node";
import { pipeline } from "@huggingface/transformers";

const { HierarchicalNSW } = hnswlib;

// id -> text; ids mimic SQLite primary keys (not 0..n, to prove labels are arbitrary ints)
const products = new Map<number, { text: string; category: string }>([
  [101, { text: "Stainless steel vacuum thermos that keeps drinks hot for 12 hours", category: "outdoor" }],
  [102, { text: "Insulated travel mug with leak-proof lid", category: "kitchen" }],
  [103, { text: "Lightweight two-person camping tent", category: "outdoor" }],
  [104, { text: "Wireless noise-cancelling headphones", category: "electronics" }],
  [105, { text: "Ceramic coffee mug, dishwasher safe", category: "kitchen" }],
  [106, { text: "Cotton summer t-shirt", category: "clothing" }],
]);
const query = "something to keep my drink hot on a camping trip";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const embed = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
const toVectors = async (texts: string[]) =>
  (await embed(texts, { pooling: "mean", normalize: true })).tolist() as number[][];

const ids = [...products.keys()];
const vectors = await toVectors(ids.map((id) => products.get(id)!.text));
const [queryVec] = await toVectors([query]);
const dim = queryVec.length;

// --- build ---
const index = new HierarchicalNSW("cosine", dim);
index.initIndex(100); // max capacity; must be >= number of points
ids.forEach((id, i) => index.addPoint(vectors[i], id));
check("index built", index.getCurrentCount() === ids.length, `${index.getCurrentCount()} points, dim ${dim}`);

const show = (r: { neighbors: number[]; distances: number[] }) =>
  r.neighbors.map((id, i) => `${id}:${(1 - r.distances[i]).toFixed(3)}`).join(", ");

// --- 1. plain kNN: cosine space returns distance = 1 - cosine similarity ---
const plain = index.searchKnn(queryVec, 3);
console.log(`      top 3 (id:similarity): ${show(plain)}`);
check("plain search ranks thermos (101) first", plain.neighbors[0] === 101);

// --- 2. filter callback: only ids allowed by a (simulated) SQL WHERE clause ---
const kitchenIds = new Set(ids.filter((id) => products.get(id)!.category === "kitchen"));
const filtered = index.searchKnn(queryVec, 2, (label: number) => kitchenIds.has(label));
console.log(`      kitchen-only: ${show(filtered)}`);
check("filter returns only allowed ids", filtered.neighbors.every((id) => kitchenIds.has(id)));
check("filter ranks insulated mug (102) first", filtered.neighbors[0] === 102);

// --- 3. edge case: k larger than the number of ids the filter allows ---
try {
  const r = index.searchKnn(queryVec, 5, (label: number) => kitchenIds.has(label));
  check("k > allowed ids returns what exists", r.neighbors.length === kitchenIds.size, `got ${r.neighbors.length}`);
} catch (e) {
  check("k > allowed ids does not throw", false, (e as Error).message);
}

// --- 4. edge case: filter allows nothing ---
try {
  const r = index.searchKnn(queryVec, 3, () => false);
  check("empty filter returns no results", r.neighbors.length === 0, `got ${r.neighbors.length}`);
} catch (e) {
  check("empty filter does not throw", false, (e as Error).message);
}

// --- 5. edge case: k larger than the whole index ---
try {
  const r = index.searchKnn(queryVec, 50);
  check("k > index size returns all points", r.neighbors.length === ids.length, `got ${r.neighbors.length}`);
} catch (e) {
  check("k > index size does not throw", false, (e as Error).message);
}

// --- 6. typed-array input: hnswlib-node rejects Float32Array ("must be an Array"),
// so typed vectors must be converted with Array.from() before addPoint/searchKnn ---
try {
  const typed = Float32Array.from(queryVec);
  const r = index.searchKnn(Array.from(typed), 1);
  check("Float32Array query works after Array.from()", r.neighbors[0] === 101);
} catch (e) {
  check("Float32Array query works after Array.from()", false, (e as Error).message);
}

// --- 7. save / load round trip ---
const file = join(mkdtempSync(join(tmpdir(), "hnsw-spike-")), "products.hnsw");
index.writeIndexSync(file);
const loaded = new HierarchicalNSW("cosine", dim);
loaded.readIndexSync(file);
const again = loaded.searchKnn(queryVec, 3);
check("index saved to disk", statSync(file).size > 0, `${statSync(file).size} bytes`);
check("loaded index has same count", loaded.getCurrentCount() === ids.length);
check(
  "loaded index returns identical results",
  JSON.stringify(again.neighbors) === JSON.stringify(plain.neighbors) &&
    again.distances.every((d, i) => Math.abs(d - plain.distances[i]) < 1e-6),
);
const loadedFiltered = loaded.searchKnn(queryVec, 2, (label: number) => kitchenIds.has(label));
check("filter works on loaded index", loadedFiltered.neighbors[0] === 102);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
