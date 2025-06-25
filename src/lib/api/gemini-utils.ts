import { APIError } from '@/lib/api/middleware/auth';
import {
  VentureAgentAnalysisResult,
  VentureAgentAnalysisResultSchema,
  ValidationError,
} from '@/types/ai';
import { ZodError } from 'zod';

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (temporary server errors)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof APIError) {
    // Check for specific HTTP status codes that are retryable
    const message = error.message.toLowerCase();
    return (
      message.includes('503') ||
      message.includes('502') ||
      message.includes('504') ||
      message.includes('429')
    );
  }
  return false;
}

/**
 * Check if error is a validation error that should trigger a retry
 */
export function isRetryableValidationError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('invalid json') ||
      message.includes('unexpected token') ||
      message.includes('parsing failed') ||
      message.includes('malformed')
    );
  }
  return false;
}

/**
 * Parse and validate JSON response from AI
 */
export function parseAndValidateAIResponse(responseText: string): VentureAgentAnalysisResult {
  let parsed: unknown;

  try {
    // First try to parse as JSON
    parsed = JSON.parse(responseText);
  } catch (parseError) {
    // Try to extract JSON from markdown code blocks or other formats
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1]);
      } catch {
        throw new Error(
          `Invalid JSON in response: ${parseError instanceof Error ? parseError.message : 'Parse failed'}`,
        );
      }
    } else {
      // Try to find JSON object in the text
      const startIndex = responseText.indexOf('{');
      const lastIndex = responseText.lastIndexOf('}');

      if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
        try {
          parsed = JSON.parse(responseText.slice(startIndex, lastIndex + 1));
        } catch {
          throw new Error(
            `Invalid JSON in response: ${parseError instanceof Error ? parseError.message : 'Parse failed'}`,
          );
        }
      } else {
        throw new Error(
          `No valid JSON found in response: ${parseError instanceof Error ? parseError.message : 'Parse failed'}`,
        );
      }
    }
  }

  // Validate against schema
  try {
    return VentureAgentAnalysisResultSchema.parse(parsed);
  } catch (validationError) {
    const errors: ValidationError[] = [];

    if (validationError instanceof ZodError) {
      for (const issue of validationError.issues) {
        errors.push({
          field: issue.path.join('.'),
          message: issue.message,
          received: 'received' in issue ? issue.received : undefined,
        });
      }
    }

    throw new Error(`Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
};

/**
 * Execute a function with retry logic for Gemini API calls
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  const { maxRetries, baseDelay } = config;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // If this is the last attempt or error is not retryable, throw it
      if (
        attempt === maxRetries ||
        (!isRetryableError(error) && !isRetryableValidationError(error))
      ) {
        throw error;
      }

      // Log retry attempt
      console.warn(
        `Gemini API attempt ${attempt + 1} failed, retrying in ${baseDelay * (attempt + 1)}ms...`,
        error instanceof Error ? error.message : String(error),
      );

      // Wait before retrying with exponential backoff
      await sleep(baseDelay * (attempt + 1));
    }
  }

  // This should never be reached, but just in case
  throw new APIError('Failed after all retries', 500);
}

/**
 * Execute AI analysis with validation and retry logic
 */
export async function executeAIAnalysisWithRetry(
  apiCall: () => Promise<string>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<VentureAgentAnalysisResult> {
  const { maxRetries, baseDelay } = config;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Get raw response from AI
      const rawResponse = await apiCall();

      // Parse and validate the response
      const validatedResult = parseAndValidateAIResponse(rawResponse);

      return validatedResult;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const shouldRetry = isRetryableError(error) || isRetryableValidationError(error);

      if (isLastAttempt || !shouldRetry) {
        // On final attempt or non-retryable error, throw with context
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new APIError(
          `AI analysis failed after ${attempt + 1} attempts: ${errorMessage}`,
          500,
        );
      }

      // Log retry attempt with more detail for validation errors
      const errorType = isRetryableValidationError(error) ? 'validation' : 'API';
      console.warn(
        `AI analysis ${errorType} error on attempt ${attempt + 1}, retrying in ${baseDelay * (attempt + 1)}ms...`,
        error instanceof Error ? error.message : String(error),
      );

      // Wait before retrying with exponential backoff
      await sleep(baseDelay * (attempt + 1));
    }
  }

  // This should never be reached, but just in case
  throw new APIError('AI analysis failed after all retries', 500);
}
