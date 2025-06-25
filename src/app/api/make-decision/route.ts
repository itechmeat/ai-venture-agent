import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAPIHandler } from '@/lib/api/base-handler';
import { APIError } from '@/lib/api/middleware/auth';
import { executeAIAnalysisWithRetry } from '@/lib/api/gemini-utils';
import { getPromptWithVariables } from '@/lib/prompts';
import {
  VentureAgentAnalysisResult,
  GeminiGenerateRequest,
  GeminiGenerateResponse,
  AI_TIMEOUT,
} from '@/types/ai';

// Request validation schema
const ventureAgentRequestSchema = z.object({
  projectData: z.object({}).passthrough(), // Allow any project data structure
});

/**
 * AI Venture Agent Analysis Response
 */
interface VentureAgentResponse {
  analysis: VentureAgentAnalysisResult;
  metadata: {
    processingTime: number;
    attempts: number;
    model: string;
  };
}

/**
 * Generate analysis using Gemini API with validation and retry
 */
async function generateVentureAgentAnalysis(
  projectData: unknown,
  apiKey: string,
): Promise<{ result: VentureAgentAnalysisResult; attempts: number }> {
  const geminiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  // Create prompt with project data
  const prompt = getPromptWithVariables('VENTURE_AGENT_ANALYSIS', {
    PROJECT_DATA: JSON.stringify(projectData, null, 2),
  });

  let attemptCount = 0;

  // Create API call function for retry logic
  const makeAPICall = async (): Promise<string> => {
    attemptCount++;

    const requestBody: GeminiGenerateRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent JSON output
        maxOutputTokens: 4096,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

    try {
      const response = await fetch(`${geminiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new APIError(`Gemini API error: ${response.status} ${response.statusText}`, 500);
      }

      const data: GeminiGenerateResponse = await response.json();

      // Handle API errors
      if (data.error) {
        throw new APIError(`Gemini API error: ${data.error.message}`, 500);
      }

      // Extract response text
      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const resultText = candidate.content.parts[0].text;
          if (resultText) {
            return resultText.trim();
          }
        }
      }

      throw new APIError('No content generated from Gemini API', 500);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new APIError('Gemini API request timeout', 408);
        }
        throw new APIError(`Gemini API error: ${error.message}`, 500);
      }
      throw new APIError('Failed to generate content with Gemini API', 500);
    }
  };

  // Execute with validation and retry
  const result = await executeAIAnalysisWithRetry(makeAPICall);

  return { result, attempts: attemptCount };
}

/**
 * AI Venture Agent analysis endpoint
 */
export const POST = createAPIHandler(async (request: NextRequest) => {
  const startTime = Date.now();

  // Parse and validate request body
  const body = await request.json();
  const validatedData = ventureAgentRequestSchema.parse(body);
  const { projectData } = validatedData;

  // Check if Gemini API key is configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new APIError('AI service not configured', 500);
  }

  try {
    // Generate analysis with validation and retry
    const { result: analysis, attempts } = await generateVentureAgentAnalysis(projectData, apiKey);

    const processingTime = Date.now() - startTime;

    // Return validated analysis
    return {
      analysis,
      metadata: {
        processingTime,
        attempts,
        model: 'gemini-2.0-flash',
      },
    } as VentureAgentResponse;
  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Log detailed error for debugging
    console.error('[Venture Agent Error]', {
      error: error instanceof Error ? error.message : String(error),
      processingTime,
      projectDataKeys:
        typeof projectData === 'object' && projectData !== null
          ? Object.keys(projectData)
          : 'invalid',
    });

    // Re-throw with additional context
    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(
      `Venture Agent analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
    );
  }
});
