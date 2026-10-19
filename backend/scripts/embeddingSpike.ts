// Spike: verify local embeddings work on this machine and that semantic similarity
// behaves sensibly for the brief's example query. Throwaway code, not part of the app.
import { pipeline } from "@huggingface/transformers";

const products = [
  "Stainless steel vacuum thermos that keeps drinks hot for 12 hours",
  "Insulated travel mug with leak-proof lid",
  "Lightweight two-person camping tent",
  "Wireless noise-cancelling headphones",
  "Ceramic coffee mug, dishwasher safe",
  "Cotton summer t-shirt",
];
const query = "something to keep my drink hot on a camping trip";

const t0 = performance.now();
const embed = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
const t1 = performance.now();

// mean pooling + L2 normalisation -> cosine similarity is just a dot product
const toVectors = async (texts: string[]) =>
  (await embed(texts, { pooling: "mean", normalize: true })).tolist() as number[][];

const [queryVec] = await toVectors([query]);
const productVecs = await toVectors(products);
const t2 = performance.now();

const dot = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const ranked = products
  .map((text, i) => ({ text, score: dot(queryVec, productVecs[i]) }))
  .sort((a, b) => b.score - a.score);

console.log(`model load: ${(t1 - t0).toFixed(0)} ms, embed 7 texts: ${(t2 - t1).toFixed(0)} ms`);
console.log(`dimensions: ${queryVec.length}`);
console.log(`query: "${query}"`);
for (const r of ranked) console.log(`  ${r.score.toFixed(3)}  ${r.text}`);
