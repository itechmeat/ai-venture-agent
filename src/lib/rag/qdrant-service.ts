import { QdrantClient } from '@qdrant/js-client-rest';
import { RAG_CONFIG, validateRagConfig } from '@/config/rag-config';

/**
 * Qdrant search result
 */
export interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload: Record<string, unknown>;
  vector?: number[];
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  results: QdrantSearchResult[];
  processingTime: number;
}

/**
 * Qdrant operation error
 */
export class QdrantError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'QdrantError';
  }
}

/**
 * Service for working with Qdrant vector database
 */
export class QdrantService {
  private readonly client: QdrantClient;
  private readonly config = RAG_CONFIG.qdrant;
  private readonly searchConfig = RAG_CONFIG.search;

  constructor() {
    validateRagConfig();

    this.client = new QdrantClient({
      url: this.config.url,
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Performs vector search in the collection
   * @param queryVector - Query vector
   * @param limit - Number of results (default from config)
   * @param scoreThreshold - Minimum relevance threshold
   * @returns Promise with search results
   * @throws {QdrantError} When search fails
   */
  async search(
    queryVector: number[],
    limit: number = this.searchConfig.topK,
    scoreThreshold: number = this.searchConfig.scoreThreshold,
  ): Promise<VectorSearchResult> {
    const startTime = Date.now();

    try {
      const searchResult = await this.client.search(this.config.collectionName, {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
        with_vector: false, // Don't return vectors to save bandwidth
      });

      const results: QdrantSearchResult[] = searchResult.map(point => ({
        id: point.id,
        score: point.score,
        payload: point.payload || {},
      }));

      return {
        results,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      throw new QdrantError(
        `Failed to search in Qdrant: ${errorMessage}`,
        'SEARCH_FAILED',
        this.isRetryableError(error as Error),
      );
    }
  }

  /**
   * Checks collection availability
   * @returns Promise<boolean> - true if collection is available
   */
  async checkCollectionHealth(): Promise<boolean> {
    try {
      const collections = await this.client.getCollections();
      const targetCollection = collections.collections.find(
        col => col.name === this.config.collectionName,
      );

      if (!targetCollection) {
        throw new QdrantError(
          `Collection '${this.config.collectionName}' not found`,
          'COLLECTION_NOT_FOUND',
        );
      }

      // Check collection information
      const collectionInfo = await this.client.getCollection(this.config.collectionName);
      
      return collectionInfo.status === 'green' || collectionInfo.status === 'yellow';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      throw new QdrantError(
        `Failed to check collection health: ${errorMessage}`,
        'HEALTH_CHECK_FAILED',
      );
    }
  }

  /**
   * Gets collection information
   * @returns Promise with collection information
   */
  async getCollectionInfo() {
    try {
      const info = await this.client.getCollection(this.config.collectionName);
      return {
        name: this.config.collectionName,
        status: info.status,
        vectorsCount: info.vectors_count,
        pointsCount: info.points_count,
        indexedVectorsCount: info.indexed_vectors_count,
        payloadSchemaCount: Object.keys(info.payload_schema || {}).length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      throw new QdrantError(
        `Failed to get collection info: ${errorMessage}`,
        'COLLECTION_INFO_FAILED',
      );
    }
  }

  /**
   * Performs search with retry logic
   * @param queryVector - Query vector
   * @param maxRetries - Maximum number of attempts
   * @returns Promise with search results
   */
  async searchWithRetry(
    queryVector: number[],
    maxRetries: number = 3,
  ): Promise<VectorSearchResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.search(queryVector);
      } catch (error) {
        lastError = error as Error;

        if (error instanceof QdrantError && !error.retryable) {
          break;
        }

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await this.sleep(delay);
      }
    }

    throw new QdrantError(
      `Failed to search after ${maxRetries} attempts: ${lastError?.message}`,
      'SEARCH_RETRY_FAILED',
    );
  }

  /**
   * Checks if error is retryable
   * @param error - Error to check
   * @returns true if error should be retried
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('rate limit')
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
 * Singleton instance of Qdrant service
 */
export const qdrantService = new QdrantService();