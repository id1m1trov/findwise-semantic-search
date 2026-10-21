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

/**
 * Small wrapper around hnswlib-node: stores one vector per product id, searches by cosine
 * similarity (optionally only among allowed ids), and saves safely to disk.
 */
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
   * Returns up to `k` closest products, best first. When `allowedIds` is given (the ids that
   * passed the SQL filters), only those can be returned. `ef` is set to at least the number of
   * products, so HNSW checks every product and the result is exact at this size.
   */
  search(vector: number[], k: number, allowedIds?: ReadonlySet<number>): VectorHit[] {
    const limit = Math.min(k, allowedIds?.size ?? this.size, this.size);
    if (limit <= 0) return [];
    this.hnsw.setEf(Math.max(this.size, limit));
    const filter = allowedIds ? (label: number) => allowedIds.has(label) : undefined;
    const { neighbors, distances } = this.hnsw.searchKnn(Array.from(vector), limit, filter);
    // hnswlib returns a distance; for cosine, distance = 1 - similarity.
    return neighbors.map((id, i) => ({ id, similarity: 1 - distances[i] }));
  }

  /**
   * Writes to a temporary file first, then renames it, so a crash never leaves a half-written
   * index. The temporary name is unique, so the server and the ingest script can both save at
   * the same time.
   */
  save(file: string): void {
    const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
    this.hnsw.writeIndexSync(tmp);
    renameSync(tmp, file);
  }
}
