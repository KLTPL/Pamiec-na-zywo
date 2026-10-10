import {
  pipeline,
  type FeatureExtractionPipeline,
} from '@huggingface/transformers';

// Multilingual (incl. Polish), small enough to run on a laptop CPU in ~20 ms per query
const MODEL = 'Xenova/multilingual-e5-small';

let extractor: Promise<FeatureExtractionPipeline> | null = null;

/**
 * E5 models expect a "query: " or "passage: " prefix; vectors come back L2-normalized,
 * so cosine similarity is a plain dot product.
 */
export async function embed(
  texts: string[],
  kind: 'query' | 'passage',
): Promise<number[][]> {
  extractor ??= pipeline('feature-extraction', MODEL, { dtype: 'q8' });
  const output = await (
    await extractor
  )(
    texts.map((text) => `${kind}: ${text}`),
    { pooling: 'mean', normalize: true },
  );
  return output.tolist() as number[][];
}

export function dot(a: readonly number[], b: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
