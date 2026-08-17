import { embed, embedMany } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getAiConfig, getGeminiApiKey } from "@/lib/ai/config";

/**
 * Embedding generation.
 *
 * Documents and queries are embedded with different `taskType` hints. That is
 * not cosmetic: gemini-embedding-001 places a passage and a question about that
 * passage in different regions unless told which is which, and asymmetric hints
 * measurably improve retrieval for question-answering.
 *
 * The API key is read here, server-side, and never leaves this process.
 */

export class EmbeddingError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EmbeddingError";
  }
}

function embeddingModel() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new EmbeddingError("GEMINI_API_KEY is not set");

  const { embeddingModel: modelId } = getAiConfig();
  return createGoogleGenerativeAI({ apiKey }).textEmbeddingModel(modelId);
}

/** Provider options shared by both call sites. */
function options(taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY") {
  const { embeddingDimensions } = getAiConfig();
  return {
    google: { taskType, outputDimensionality: embeddingDimensions },
  };
}

/** Embeds a user question, for searching against stored documents. */
export async function embedQuery(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: embeddingModel(),
      value: text,
      providerOptions: options("RETRIEVAL_QUERY"),
    });
    return embedding;
  } catch (error) {
    throw new EmbeddingError("Failed to embed query", { cause: error });
  }
}

/**
 * Embeds knowledge chunks for storage.
 *
 * Batched: the model accepts up to 100 values per call, so a full re-ingest of
 * this corpus is a single request rather than one per chunk.
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const { embeddings } = await embedMany({
      model: embeddingModel(),
      values: texts,
      providerOptions: options("RETRIEVAL_DOCUMENT"),
    });
    return embeddings;
  } catch (error) {
    throw new EmbeddingError("Failed to embed documents", { cause: error });
  }
}
