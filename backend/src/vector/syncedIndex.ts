import type { ProductRepository } from "../db/productRepository.js";
import type { Embedder } from "../embeddings/embedder.js";
import { ensureIndex } from "./indexManager.js";
import type { VectorIndex } from "./vectorIndex.js";

/** Where the search service gets its index from. */
export interface IndexSource {
  get(): Promise<VectorIndex>;
}

/** For tests and scripts: an index that never changes. */
export const fixedIndex = (index: VectorIndex): IndexSource => ({ get: async () => index });

interface SyncedIndexOptions {
  repo: ProductRepository;
  embedder: Embedder;
  indexFile: string;
  metaFile: string;
  log?: (message: string) => void;
}

/**
 * Keeps the in-memory index in step with SQLite while the server runs. Before handing out the
 * index it checks SQLite's data_version; if another process (e.g. `npm run ingest`) changed the
 * database, it re-runs the same load-or-rebuild check used at startup.
 */
export class SyncedIndex implements IndexSource {
  private refreshing?: Promise<void>;

  private constructor(
    private readonly options: SyncedIndexOptions,
    private current: VectorIndex,
    private dataVersion: number,
  ) {}

  static async open(options: SyncedIndexOptions): Promise<{ index: SyncedIndex; rebuilt: boolean; reason: string }> {
    const dataVersion = options.repo.dataVersion();
    const { index, rebuilt, reason } = await ensureIndex(options);
    return { index: new SyncedIndex(options, index, dataVersion), rebuilt, reason };
  }

  get size(): number {
    return this.current.size;
  }

  async get(): Promise<VectorIndex> {
    if (this.options.repo.dataVersion() !== this.dataVersion) {
      // Concurrent searches share one refresh instead of each starting their own.
      this.refreshing ??= this.refresh().finally(() => (this.refreshing = undefined));
      await this.refreshing;
    }
    return this.current;
  }

  private async refresh(): Promise<void> {
    const version = this.options.repo.dataVersion(); // read first: changes made during the refresh trigger another
    const { index, rebuilt, reason } = await ensureIndex(this.options);
    this.current = index;
    this.dataVersion = version;
    this.options.log?.(`[index] database changed: index ${rebuilt ? "rebuilt" : "reloaded"} (${index.size} vectors): ${reason}`);
  }
}
