import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAPIHandler } from '@/lib/api/base-handler';
import { APIError } from '@/lib/api/middleware/auth';
import { generateVentureAgentAnalysis } from '@/lib/api/ai-utils';
import { getPromptWithVariables } from '@/lib/prompts';
import { VentureAgentAnalysisResult, AvailableModel } from '@/types/ai';

// Request validation schema
const ventureAgentRequestSchema = z.object({
  projectData: z.object({}).passthrough(), // Allow any project data structure
  selectedModel: z.string().optional(), // Optional model selection
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
 * AI Venture Agent analysis endpoint
 */
export const POST = createAPIHandler(async (request: NextRequest) => {
  const startTime = Date.now();

  // Parse and validate request body
  const body = await request.json();
  const validatedData = ventureAgentRequestSchema.parse(body);
  const { projectData, selectedModel } = validatedData;

  try {
    // Create prompt with project data
    const prompt = getPromptWithVariables('VENTURE_AGENT_ANALYSIS', {
      PROJECT_DATA: JSON.stringify(projectData, null, 2),
    });

    // Generate analysis with validation and retry using universal AI utils
    const {
      result: analysis,
      attempts,
      model,
    } = await generateVentureAgentAnalysis(prompt, selectedModel as AvailableModel);

    const processingTime = Date.now() - startTime;

    // Return validated analysis
    return {
      analysis,
      metadata: {
        processingTime,
        attempts,
        model,
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
