import { embeddingsService, EmbeddingError } from './embeddings-service';
import { qdrantService, QdrantError, QdrantSearchResult } from './qdrant-service';
import { RAG_CONFIG } from '@/config/rag-config';
// Removed tiktoken import to avoid WASM issues in serverless environment

/**
 * Relevant context from the knowledge base
 */
export interface RagContext {
  content: string;
  source: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * RAG analysis result
 */
export interface RagAnalysisResult {
  context: RagContext[];
  totalTokens: number;
  processingTime: number;
  searchResults: number;
}

/**
 * RAG analysis error
 */
export class RagAnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'RagAnalysisError';
  }
}

/**
 * Main class for RAG analysis of startups
 */
export class RagAnalyzer {
  private readonly searchConfig = RAG_CONFIG.search;

  /**
   * Performs RAG analysis for startup data
   * @param startupData - Startup data for analysis
   * @returns Promise with relevant context from the knowledge base
   * @throws {RagAnalysisError} When analysis fails
   */
  async analyzeStartup(startupData: Record<string, unknown>): Promise<RagAnalysisResult> {
    const startTime = Date.now();

    try {
      // 1. Build search query from startup data
      const searchQuery = this.buildSearchQuery(startupData);

      // 2. Generate embedding for the query
      const embeddingResult = await embeddingsService.generateEmbedding(searchQuery);

      // 3. Search for relevant documents in Qdrant
      const searchResult = await qdrantService.searchWithRetry(embeddingResult.embedding);

      // 4. Process search results
      const context = this.processSearchResults(searchResult.results);

      // 5. Count tokens
      const totalTokens = this.countTokens(context.map(c => c.content).join('\n'));

      return {
        context,
        totalTokens,
        processingTime: Date.now() - startTime,
        searchResults: searchResult.results.length,
      };
    } catch (error) {
      if (error instanceof EmbeddingError) {
        throw new RagAnalysisError(
          'Failed to generate embeddings for startup analysis',
          'EMBEDDING_FAILED',
          error,
        );
      }

      if (error instanceof QdrantError) {
        throw new RagAnalysisError(
          'Failed to search in vector database',
          'VECTOR_SEARCH_FAILED',
          error,
        );
      }

      throw new RagAnalysisError(
        `RAG analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ANALYSIS_FAILED',
        error as Error,
      );
    }
  }

  /**
   * Creates search query from startup data
   * @param startupData - Startup data
   * @returns Search query
   */
  private buildSearchQuery(startupData: Record<string, unknown>): string {
    const queryParts: string[] = [];

    // Basic startup information
    if (startupData.name) {
      queryParts.push(`startup name: ${startupData.name}`);
    }

    if (startupData.description) {
      queryParts.push(`description: ${startupData.description}`);
    }

    if (startupData.tagline) {
      queryParts.push(`tagline: ${startupData.tagline}`);
    }

    // Market and industry information
    if (startupData.industry) {
      queryParts.push(`industry: ${startupData.industry}`);
    }

    if (startupData.stage) {
      queryParts.push(`stage: ${startupData.stage}`);
    }

    // Financial information
    if (startupData.funding) {
      queryParts.push(`funding: ${JSON.stringify(startupData.funding)}`);
    }

    // Team
    if (startupData.team) {
      queryParts.push(`team: ${JSON.stringify(startupData.team)}`);
    }

    // Business model
    if (startupData.businessModel) {
      queryParts.push(`business model: ${startupData.businessModel}`);
    }

    // If no data available, use general query
    if (queryParts.length === 0) {
      queryParts.push('venture capital startup investment analysis');
    }

    return queryParts.join(' ').slice(0, 2000); // Limit query length
  }

  /**
   * Processes search results from Qdrant
   * @param searchResults - Search results
   * @returns Array of relevant context
   */
  private processSearchResults(searchResults: QdrantSearchResult[]): RagContext[] {
    const contexts: RagContext[] = [];
    let totalTokens = 0;

    for (const result of searchResults) {
      // Extract content from payload
      const content = this.extractContent(result.payload);
      
      if (!content) {
        continue;
      }

      // Count tokens for this content
      const contentTokens = this.countTokens(content);
      
      // Check if we exceed token limit
      if (totalTokens + contentTokens > this.searchConfig.maxContextLength) {
        break;
      }

      contexts.push({
        content,
        source: this.extractSource(result.payload),
        score: result.score,
        metadata: {
          id: result.id,
          ...result.payload,
        },
      });

      totalTokens += contentTokens;
    }

    return contexts;
  }

  /**
   * Extracts text content from payload
   * @param payload - Qdrant payload
   * @returns Text content or null
   */
  private extractContent(payload: Record<string, unknown>): string | null {
    // Try different fields for content
    const contentFields = ['text', 'content', 'chunk', 'page_content', 'body'];
    
    for (const field of contentFields) {
      const value = payload[field];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  /**
   * Extracts source from payload
   * @param payload - Qdrant payload
   * @returns Source or unknown
   */
  private extractSource(payload: Record<string, unknown>): string {
    const sourceFields = ['source', 'file', 'chapter', 'section', 'page'];
    
    for (const field of sourceFields) {
      const value = payload[field];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      if (typeof value === 'number') {
        return `${field} ${value}`;
      }
    }

    return 'unknown';
  }

  /**
   * Counts the number of tokens in text
   * @param text - Text to count
   * @returns Number of tokens
   */
  private countTokens(text: string): number {
    // Simple token counting approximation (avoiding tiktoken WASM issues)
    // Roughly 1.3 tokens per word for English text
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  /**
   * Creates prompt context from RAG results
   * @param contexts - Array of contexts
   * @returns Formatted context for prompt
   */
  createPromptContext(contexts: RagContext[]): string {
    if (contexts.length === 0) {
      return 'No relevant context found in the venture capital knowledge base.';
    }

    const contextParts = contexts.map((context, index) => {
      return [
        `--- Context ${index + 1} (Score: ${context.score.toFixed(3)}, Source: ${context.source}) ---`,
        context.content,
        '', // Empty line for separation
      ].join('\n');
    });

    return [
      '=== VENTURE CAPITAL EXPERT KNOWLEDGE BASE ===',
      '',
      contextParts.join('\n'),
      '=== END OF KNOWLEDGE BASE ===',
    ].join('\n');
  }

  /**
   * Checks the quality of found context
   * @param contexts - Array of contexts
   * @returns true if context is sufficiently relevant
   */
  isContextRelevant(contexts: RagContext[]): boolean {
    if (contexts.length === 0) {
      return false;
    }

    // Check that at least one context has a high score
    const hasHighQualityContext = contexts.some(
      context => context.score >= this.searchConfig.scoreThreshold,
    );

    return hasHighQualityContext;
  }
}

/**
 * Singleton instance of RAG analyzer
 */
export const ragAnalyzer = new RagAnalyzer();