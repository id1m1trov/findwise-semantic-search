// Relevance evaluation: `npm run eval`.
// Answers two separate questions:
//   1. Does the embedding model rank the right products first?  (hit@3, MRR vs expected SKUs)
//   2. Does HNSW return the true nearest neighbours?            (recall@10 vs exact brute force)
// Works on an in-memory copy of the catalog, so it never touches the app's database.
import { readFileSync } from "node:fs";
import { loadCatalog, toCents } from "../src/catalog/catalog.js";
import { config } from "../src/config.js";
import { openDatabase } from "../src/db/database.js";
import { type Product, type ProductFilters, ProductRepository } from "../src/db/productRepository.js";
import { TransformersEmbedder } from "../src/embeddings/embedder.js";
import { embeddingText } from "../src/embeddings/embeddingText.js";
import { SearchService } from "../src/search/searchService.js";
import { VectorIndex } from "../src/vector/vectorIndex.js";

interface EvalFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}
interface RankingCase {
  query: string;
  filters?: EvalFilters;
  relevant: string[];
  mustNotInTop3: string[];
  note?: string;
}
interface NoResultCase {
  query: string;
  filters?: EvalFilters;
  expectedOutcome: "no_relevant_matches" | "no_filter_matches";
}
interface EvalFile {
  semantic: RankingCase[];
  combined: RankingCase[];
  noResults: NoResultCase[];
  heldOut: RankingCase[];
}

const evalFile = JSON.parse(
  readFileSync(config.catalogFile.replace("products.json", "evalQueries.json"), "utf-8"),
) as EvalFile;

const repo = new ProductRepository(openDatabase(":memory:"));
repo.syncCatalog(loadCatalog(config.catalogFile));
const products = repo.listAll();
const byId = new Map(products.map((p) => [p.id, p]));
const embedder = new TransformersEmbedder(config.embeddingModel, config.embeddingDimension);

const toFilters = (f: EvalFilters = {}): ProductFilters => ({
  category: f.category,
  minPriceCents: f.minPrice === undefined ? undefined : toCents(f.minPrice),
  maxPriceCents: f.maxPrice === undefined ? undefined : toCents(f.maxPrice),
});
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const pad = (s: string | number, n: number) => String(s).padEnd(n);

/** Embeds the catalog with a given text recipe and returns both an HNSW index and the raw vectors. */
async function prepare(recipe: (p: Product) => string) {
  const vectors = await embedder.embed(products.map(recipe));
  const vectorById = new Map(products.map((p, i) => [p.id, vectors[i]]));
  const index = VectorIndex.build(embedder.dimension, products.map((p, i) => ({ id: p.id, vector: vectors[i] })));
  return { index, vectorById };
}

interface CaseResult {
  firstRelevantRank: number | null; // 1-based, over the full ranking
  top3: string[];
  trapsInTop3: string[];
  bestRelevantSimilarity: number;
  topSimilarity: number;
  recallAt10: number; // HNSW vs exact
}

async function runRankingCase(c: RankingCase, prepared: Awaited<ReturnType<typeof prepare>>): Promise<CaseResult> {
  const candidates = repo.findIds(toFilters(c.filters));
  const [q] = await embedder.embed([c.query]);
  const hnsw = prepared.index.search(q, candidates.length, new Set(candidates));
  const exact = candidates
    .map((id) => ({ id, similarity: dot(q, prepared.vectorById.get(id)!) }))
    .sort((a, b) => b.similarity - a.similarity);

  const ranked = hnsw.map((h) => ({ sku: byId.get(h.id)!.sku, similarity: h.similarity }));
  const rank = ranked.findIndex((r) => c.relevant.includes(r.sku));
  const top3 = ranked.slice(0, 3).map((r) => r.sku);
  const k = Math.min(10, candidates.length);
  const exactTop = new Set(exact.slice(0, k).map((e) => e.id));
  return {
    firstRelevantRank: rank === -1 ? null : rank + 1,
    top3,
    trapsInTop3: top3.filter((s) => c.mustNotInTop3.includes(s)),
    bestRelevantSimilarity: Math.max(...ranked.filter((r) => c.relevant.includes(r.sku)).map((r) => r.similarity)),
    topSimilarity: ranked[0]?.similarity ?? 0,
    recallAt10: hnsw.slice(0, k).filter((h) => exactTop.has(h.id)).length / k,
  };
}

function summarise(results: CaseResult[]) {
  const n = results.length || 1;
  return {
    hitAt3: results.filter((r) => r.firstRelevantRank !== null && r.firstRelevantRank <= 3).length / n,
    mrr: results.reduce((s, r) => s + (r.firstRelevantRank ? 1 / r.firstRelevantRank : 0), 0) / n,
    trapViolations: results.reduce((s, r) => s + r.trapsInTop3.length, 0),
    recallAt10: results.reduce((s, r) => s + r.recallAt10, 0) / n,
  };
}

async function runGroup(name: string, cases: RankingCase[], prepared: Awaited<ReturnType<typeof prepare>>, print: boolean) {
  const results: CaseResult[] = [];
  if (print && cases.length) {
    console.log(`\n## ${name}\n`);
    console.log(`${pad("query", 52)}${pad("rank", 6)}${pad("best sim", 10)}${pad("top 3", 27)}traps in top 3`);
  }
  for (const c of cases) {
    const r = await runRankingCase(c, prepared);
    results.push(r);
    if (print) {
      const label = c.filters ? `${c.query} [${JSON.stringify(c.filters)}]` : c.query;
      console.log(
        `${pad(label.slice(0, 50), 52)}${pad(r.firstRelevantRank ?? "-", 6)}${pad(r.bestRelevantSimilarity.toFixed(3), 10)}` +
          `${pad(r.top3.join(" "), 27)}${r.trapsInTop3.join(" ") || "-"}`,
      );
    }
  }
  return results;
}

// ---------------------------------------------------------------------------------------------

const current = await prepare(embeddingText);
const rankingGroups: [string, RankingCase[]][] = [
  ["Semantic relevance (no filters)", evalFile.semantic],
  ["Combined (query + filters)", evalFile.combined],
  ["Held-out (written before seeing results)", evalFile.heldOut],
];

console.log(`# Evaluation: ${products.length} products, model ${config.embeddingModel}`);
const allResults: Record<string, CaseResult[]> = {};
for (const [name, cases] of rankingGroups) allResults[name] = await runGroup(name, cases, current, true);

console.log("\n## No-result cases (threshold " + config.minSimilarity + ")\n");
const service = new SearchService({
  repo,
  embedder,
  index: current.index,
  minSimilarity: config.minSimilarity,
  strongSimilarity: config.strongSimilarity,
});
let noResultPasses = 0;
const noResultTopSims: number[] = [];
for (const c of evalFile.noResults) {
  const { meta } = await service.search({ query: c.query, filters: toFilters(c.filters), limit: 10 });
  const candidates = repo.findIds(toFilters(c.filters));
  const [q] = await embedder.embed([c.query]);
  const top = current.index.search(q, 1, new Set(candidates))[0]?.similarity;
  if (top !== undefined) noResultTopSims.push(top);
  const ok = meta.outcome === c.expectedOutcome;
  noResultPasses += Number(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${pad(c.query + (c.filters ? ` ${JSON.stringify(c.filters)}` : ""), 70)} ${meta.outcome}  (top sim ${top?.toFixed(3) ?? "n/a"})`);
}

console.log("\n## Summary\n");
console.log(`${pad("group", 44)}${pad("cases", 7)}${pad("hit@3", 8)}${pad("MRR", 8)}${pad("traps", 7)}HNSW recall@10 vs exact`);
for (const [name, results] of Object.entries(allResults)) {
  if (!results.length) continue;
  const s = summarise(results);
  console.log(`${pad(name, 44)}${pad(results.length, 7)}${pad(s.hitAt3.toFixed(2), 8)}${pad(s.mrr.toFixed(2), 8)}${pad(s.trapViolations, 7)}${s.recallAt10.toFixed(3)}`);
}
console.log(`No-result cases: ${noResultPasses}/${evalFile.noResults.length} passed`);

// Threshold calibration: the cut-off must sit above unrelated queries and below real matches.
const relevantSims = [...evalFile.semantic, ...evalFile.combined].map((_, i) =>
  [...allResults[rankingGroups[0][0]], ...allResults[rankingGroups[1][0]]][i].bestRelevantSimilarity,
);
console.log(
  `\nThreshold calibration: lowest best-relevant similarity ${Math.min(...relevantSims).toFixed(3)}, ` +
    `highest no-result similarity ${Math.max(...noResultTopSims).toFixed(3)} (current cut-off ${config.minSimilarity}, strong ${config.strongSimilarity})`,
);

// Recipe comparison: is it worth adding the category to the embedded text?
const withCategory = await prepare((p) => `${p.name}. ${p.category}. ${p.description}`);
const variant = summarise(await runGroup("", evalFile.semantic, withCategory, false));
const base = summarise(allResults[rankingGroups[0][0]]);
console.log("\n## Embedding text recipe (semantic group)\n");
console.log(`name + description (current):         hit@3 ${base.hitAt3.toFixed(2)}  MRR ${base.mrr.toFixed(2)}  traps ${base.trapViolations}`);
console.log(`name + category + description:        hit@3 ${variant.hitAt3.toFixed(2)}  MRR ${variant.mrr.toFixed(2)}  traps ${variant.trapViolations}`);
