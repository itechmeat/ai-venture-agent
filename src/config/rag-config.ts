/**
 * RAG system configuration
 */

export const RAG_CONFIG = {
  /**
   * Qdrant connection settings
   */
  qdrant: {
    url: process.env.QDRANT_CLOUDE_URL || '',
    apiKey: process.env.QDRANT_CLOUDE_API_KEY || '',
    collectionName: 'ben-horowitz',
    timeout: 30000, // 30 seconds
  },

  /**
   * Vector search parameters
   */
  search: {
    topK: 5, // Number of most relevant documents
    scoreThreshold: 0.3, // Minimum relevance threshold (lowered for better results)
    maxContextLength: 4000, // Maximum context length in tokens
  },

  /**
   * Embeddings settings
   */
  embeddings: {
    model: 'text-embedding-3-small', // OpenAI embeddings model
    dimensions: 1536, // Embeddings dimensions
    maxRetries: 3,
    timeout: 15000, // 15 seconds
  },

  /**
   * AI analysis settings
   */
  analysis: {
    maxTokens: 8000,
    temperature: 0.3, // More deterministic analysis
    timeout: 60000, // 60 seconds for analysis
  },
} as const;

/**
 * Validates RAG configuration
 * @throws {Error} If required environment variables are missing
 */
export function validateRagConfig(): void {
  if (!RAG_CONFIG.qdrant.url) {
    throw new Error('QDRANT_CLOUDE_URL environment variable is required');
  }

  if (!RAG_CONFIG.qdrant.apiKey) {
    throw new Error('QDRANT_CLOUDE_API_KEY environment variable is required');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required for embeddings');
  }
}
