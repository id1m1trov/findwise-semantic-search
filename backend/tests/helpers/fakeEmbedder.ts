import type { Embedder } from "../../src/embeddings/embedder.js";

/**
 * Deterministic stand-in for the real model: a hashed bag of words. Texts sharing words get
 * similar vectors. It has no understanding of meaning; it exists to test the pipeline
 * (filters, thresholds, ordering) quickly and without loading a model.
 */
export class FakeEmbedder implements Embedder {
  readonly dimension = 64;
  calls = 0;

  constructor(readonly modelName = "fake-bag-of-words") {}

  async embed(texts: string[]): Promise<number[][]> {
    this.calls++;
    return texts.map((text) => {
      const v = new Array<number>(this.dimension).fill(0);
      v[0] = 0.05; // small constant so a text with no known words is not a zero vector
      for (const word of text.toLowerCase().match(/[a-z]+/g) ?? []) {
        let h = 0;
        for (const ch of word) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        v[1 + (h % (this.dimension - 1))] += 1;
      }
      const norm = Math.hypot(...v);
      return v.map((x) => x / norm);
    });
  }
}
