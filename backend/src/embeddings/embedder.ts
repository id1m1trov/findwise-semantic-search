import { env, pipeline } from "@huggingface/transformers";

/** Turns texts into vectors. Implemented by the local model and by a fake in tests. */
export interface Embedder {
  readonly modelName: string;
  readonly dimension: number;
  /** Returns one L2-normalised vector per input text. */
  embed(texts: string[]): Promise<number[][]>;
}

type Extractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;

/** Runs a sentence-transformer model locally with transformers.js (ONNX on CPU, no API key). */
export class TransformersEmbedder implements Embedder {
  private extractor?: Promise<Extractor>;

  constructor(
    readonly modelName: string,
    readonly dimension: number,
    /** Where downloaded model files are stored; defaults to the library's own cache folder. */
    private readonly cacheDir?: string,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    // Load the model once, on first use; later calls reuse the same promise.
    if (!this.extractor) {
      // Set globally: the per-call `cache_dir` option is not applied to every model file.
      if (this.cacheDir) env.cacheDir = this.cacheDir;
      this.extractor = pipeline("feature-extraction", this.modelName, { dtype: "q8" }) as unknown as Promise<Extractor>;
    }
    const extract = await this.extractor;
    // Mean pooling averages the token vectors into one sentence vector; normalising it
    // makes cosine similarity a plain dot product.
    const vectors = (await extract(texts, { pooling: "mean", normalize: true })).tolist();
    if (vectors[0]?.length !== this.dimension) {
      throw new Error(`Model ${this.modelName} returned ${vectors[0]?.length} dimensions, expected ${this.dimension}`);
    }
    return vectors;
  }
}
