import { OpenAI } from 'openai';
import { RAG_CONFIG, validateRagConfig } from '@/config/rag-config';

/**
 * Embeddings generation result
 */
export interface EmbeddingResult {
  embedding: number[];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Embeddings generation error
 */
export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

/**
 * Service for generating embeddings through OpenAI API
 */
export class EmbeddingsService {
  private readonly openai: OpenAI;
  private readonly config = RAG_CONFIG.embeddings;

  constructor() {
    validateRagConfig();
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: this.config.timeout,
    });
  }

  /**
   * Generates embedding for text
   * @param text - Text for vectorization
   * @returns Promise with embedding vector
   * @throws {EmbeddingError} When generation fails
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!text.trim()) {
      throw new EmbeddingError('Text cannot be empty', 'INVALID_INPUT');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.openai.embeddings.create({
          model: this.config.model,
          input: text,
          dimensions: this.config.dimensions,
        });

        if (!response.data?.[0]?.embedding) {
          throw new EmbeddingError(
            'No embedding returned from OpenAI',
            'NO_EMBEDDING_RETURNED',
          );
        }

        return {
          embedding: response.data[0].embedding,
          usage: {
            promptTokens: response.usage.prompt_tokens,
            totalTokens: response.usage.total_tokens,
          },
        };
      } catch (error) {
        lastError = error as Error;

        // Check if request should be retried
        const isRetryable = this.isRetryableError(error as Error);
        
        if (!isRetryable || attempt === this.config.maxRetries) {
          break;
        }

        // Exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await this.sleep(delay);
      }
    }

    // If we got here, all attempts are exhausted
    const errorMessage = lastError?.message || 'Unknown error';
    const isRetryable = this.isRetryableError(lastError!);
    
    throw new EmbeddingError(
      `Failed to generate embedding after ${this.config.maxRetries} attempts: ${errorMessage}`,
      'GENERATION_FAILED',
      isRetryable,
    );
  }

  /**
   * Generates embeddings for array of texts
   * @param texts - Array of texts for vectorization
   * @returns Promise with array of embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) {
      return [];
    }

    // Process texts sequentially to avoid rate limits
    const results: EmbeddingResult[] = [];
    
    for (const text of texts) {
      const result = await this.generateEmbedding(text);
      results.push(result);
    }

    return results;
  }

  /**
   * Checks if error is retryable
   * @param error - Error to check
   * @returns true if error should be retried
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Rate limit or temporary server errors
    return (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('connection') ||
      message.includes('network')
    );
  }

  /**
   * Promise for delay
   * @param ms - Delay in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance of embeddings service
 */
export const embeddingsService = new EmbeddingsService();