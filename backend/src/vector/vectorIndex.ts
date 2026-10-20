import { randomUUID } from "node:crypto";
import { renameSync } from "node:fs";
import hnswlib from "hnswlib-node";

const { HierarchicalNSW } = hnswlib;
type Hnsw = InstanceType<typeof HierarchicalNSW>;

export interface IndexedVector {
  id: number; // SQLite product id, used as the HNSW label
  vector: number[];
}

export interface VectorHit {
  id: number;
  similarity: number; // cosine similarity, 1 = same direction, 0 = unrelated
}

const RANDOM_SEED = 42; // fixed so rebuilding the same data gives the same graph

/** Thin wrapper around hnswlib-node: cosine space, integer labels, filtered search, atomic save. */
export class VectorIndex {
  private constructor(
    private readonly hnsw: Hnsw,
    readonly dimension: number,
  ) {}

  static build(dimension: number, items: IndexedVector[]): VectorIndex {
    const hnsw = new HierarchicalNSW("cosine", dimension);
    hnsw.initIndex({ maxElements: Math.max(items.length, 1), randomSeed: RANDOM_SEED });
    for (const { id, vector } of items) {
      if (vector.length !== dimension) throw new Error(`Vector for id ${id} has ${vector.length} dimensions`);
      hnsw.addPoint(Array.from(vector), id); // hnswlib-node rejects typed arrays
    }
    return new VectorIndex(hnsw, dimension);
  }

  static load(file: string, dimension: number): VectorIndex {
    const hnsw = new HierarchicalNSW("cosine", dimension);
    hnsw.readIndexSync(file);
    return new VectorIndex(hnsw, dimension);
  }

  get size(): number {
    return this.hnsw.getCurrentCount();
  }

  /**
   * Returns up to `k` nearest neighbours, best first. When `allowedIds` is given, only those
   * labels can be returned (the SQL pre-filter). `ef` is set to at least the index size, so at
   * this catalog size the search is effectively exhaustive and therefore exact.
   */
  search(vector: number[], k: number, allowedIds?: ReadonlySet<number>): VectorHit[] {
    const limit = Math.min(k, allowedIds?.size ?? this.size, this.size);
    if (limit <= 0) return [];
    this.hnsw.setEf(Math.max(this.size, limit));
    const filter = allowedIds ? (label: number) => allowedIds.has(label) : undefined;
    const { neighbors, distances } = this.hnsw.searchKnn(Array.from(vector), limit, filter);
    // In cosine space hnswlib returns distance = 1 - cosine similarity.
    return neighbors.map((id, i) => ({ id, similarity: 1 - distances[i] }));
  }

  /**
   * Writes to a temp file first, then renames, so a crash never leaves a half-written index.
   * The temp name is unique so the server and the ingest script can save at the same time.
   */
  save(file: string): void {
    const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
    this.hnsw.writeIndexSync(tmp);
    renameSync(tmp, file);
  }
}
