import type { Product, ProductFilters, ProductRepository } from "../db/productRepository.js";
import type { Embedder } from "../embeddings/embedder.js";
import type { IndexSource } from "../vector/syncedIndex.js";

export interface SearchParams {
  query: string; // empty string = browse the filtered products
  filters: ProductFilters;
  limit: number;
}

/** A display band, not a probability: derived from cosine-similarity cut-offs. */
export type Relevance = "strong" | "good";

export interface SearchHit {
  product: Product;
  similarity: number | null; // null in browse mode
  relevance: Relevance | null;
}

export type SearchOutcome = "results" | "no_filter_matches" | "no_relevant_matches";

export interface SearchMeta {
  mode: "semantic" | "browse";
  outcome: SearchOutcome;
  matchingFilters: number; // products that passed the SQL filters
  relevantCount: number; // of those, how many scored above the cut-off (browse: = matchingFilters)
  returned: number;
  minSimilarity: number;
  tookMs: number;
}

export interface SearchResponse {
  hits: SearchHit[];
  meta: SearchMeta;
}

export interface SearchServiceOptions {
  repo: ProductRepository;
  embedder: Embedder;
  index: IndexSource; // checked on every search, so it follows database changes
  minSimilarity: number;
  strongSimilarity: number;
}

/**
 * Hybrid search in three stages:
 *   1. filter: SQLite returns the ids allowed by category / price
 *   2. rank:   the query vector is compared only against those ids in the HNSW index
 *   3. load:   SQLite returns the full rows for the ranked ids; weak matches are dropped
 */
export class SearchService {
  constructor(private readonly options: SearchServiceOptions) {}

  async search({ query, filters, limit }: SearchParams): Promise<SearchResponse> {
    const started = performance.now();
    const { repo, embedder, minSimilarity, strongSimilarity } = this.options;
    const done = (hits: SearchHit[], meta: Omit<SearchMeta, "returned" | "minSimilarity" | "tookMs">) => ({
      hits,
      meta: { ...meta, returned: hits.length, minSimilarity, tookMs: Math.round(performance.now() - started) },
    });

    // 1. filter
    const candidateIds = repo.findIds(filters);
    const trimmed = query.trim();

    if (trimmed === "") {
      const products = repo.findByFilters(filters, limit);
      return done(
        products.map((product) => ({ product, similarity: null, relevance: null })),
        {
          mode: "browse",
          outcome: products.length ? "results" : "no_filter_matches",
          matchingFilters: candidateIds.length,
          relevantCount: candidateIds.length,
        },
      );
    }

    if (candidateIds.length === 0) {
      return done([], { mode: "semantic", outcome: "no_filter_matches", matchingFilters: 0, relevantCount: 0 });
    }

    // 2. rank: every candidate is ranked so we can report how many are relevant
    const [queryVector] = await embedder.embed([trimmed]);
    const index = await this.options.index.get();
    const ranked = index.search(queryVector, candidateIds.length, new Set(candidateIds));
    const relevant = ranked.filter((hit) => hit.similarity >= minSimilarity);

    // 3. load full rows, keeping the ranking order
    const top = relevant.slice(0, limit);
    const products = repo.getByIds(top.map((hit) => hit.id));
    const similarityById = new Map(top.map((hit) => [hit.id, hit.similarity]));
    const hits = products.map((product) => {
      const similarity = round(similarityById.get(product.id)!);
      return { product, similarity, relevance: (similarity >= strongSimilarity ? "strong" : "good") as Relevance };
    });

    return done(hits, {
      mode: "semantic",
      outcome: hits.length ? "results" : "no_relevant_matches",
      matchingFilters: candidateIds.length,
      relevantCount: relevant.length,
    });
  }
}

const round = (n: number) => Math.round(n * 1000) / 1000;
