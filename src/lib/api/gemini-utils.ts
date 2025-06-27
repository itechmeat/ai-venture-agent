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

  // Aggressive response cleanup
  const cleanResponse = (text: string): string => {
    // Remove everything before first opening brace and everything after last closing brace
    const startIndex = text.indexOf('{');
    const lastIndex = text.lastIndexOf('}');

    if (startIndex === -1 || lastIndex === -1 || lastIndex <= startIndex) {
      throw new Error('No valid JSON object found in response');
    }

    let cleanedText = text.slice(startIndex, lastIndex + 1);

    // Remove possible markdown blocks
    cleanedText = cleanedText.replace(/```(?:json)?\s*|\s*```/g, '');

    // Remove possible comments and extra characters
    cleanedText = cleanedText.replace(/\/\/.*$/gm, ''); // single-line comments
    cleanedText = cleanedText.replace(/\/\*[\s\S]*?\*\//g, ''); // multi-line comments

    // Remove extra spaces and line breaks
    cleanedText = cleanedText.trim();

    return cleanedText;
  };

  try {
    // Try to parse original response
    parsed = JSON.parse(responseText);
  } catch (parseError) {
    console.warn('Initial JSON parse failed, attempting cleanup...', {
      error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 200) + '...',
    });

    try {
      // Clean response and try again
      const cleanedText = cleanResponse(responseText);
      console.log('Attempting to parse cleaned response:', {
        cleanedLength: cleanedText.length,
        cleanedPreview: cleanedText.substring(0, 200) + '...',
      });

      parsed = JSON.parse(cleanedText);
    } catch (cleanupError) {
      // Last attempt - extract JSON from markdown blocks
      console.warn('Cleanup parse failed, trying markdown extraction...', {
        error: cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error',
      });

      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const extractedJson = jsonMatch[1].trim();
          console.log('Attempting to parse extracted JSON from markdown:', {
            extractedLength: extractedJson.length,
            extractedPreview: extractedJson.substring(0, 200) + '...',
          });

          parsed = JSON.parse(extractedJson);
        } catch (extractError) {
          console.error('All JSON parsing attempts failed:', {
            original: parseError instanceof Error ? parseError.message : 'Unknown',
            cleanup: cleanupError instanceof Error ? cleanupError.message : 'Unknown',
            extract: extractError instanceof Error ? extractError.message : 'Unknown',
            responseText: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
          });

          throw new Error(
            `Failed to parse JSON after all attempts. Original error: ${parseError instanceof Error ? parseError.message : 'Parse failed'}. Response preview: ${responseText.substring(0, 200)}...`,
          );
        }
      } else {
        console.error('No JSON found in any format:', {
          responseText: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
        });

        throw new Error(
          `No valid JSON found in response after all parsing attempts. Response preview: ${responseText.substring(0, 200)}...`,
        );
      }
    }
  }

  // Check that we got an object
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Parsed result is not an object: ${typeof parsed}`);
  }

  // Validate against schema
  try {
    const result = VentureAgentAnalysisResultSchema.parse(parsed);
    console.log('Successfully parsed and validated AI response');
    return result;
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

    console.error('Validation failed:', {
      errors,
      parsedObject: parsed,
    });

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
