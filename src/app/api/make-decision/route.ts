import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAPIHandler } from '@/lib/api/base-handler';
import { APIError } from '@/lib/api/middleware/auth';
import { generateMultiExpertAnalysis } from '@/lib/api/ai-utils';
import { getPromptWithVariables } from '@/lib/prompts';
import { MultiExpertAnalysisResult, AvailableModel } from '@/types/ai';
import investmentExperts from '@/data/investment_experts.json';

// Request validation schema
const ventureAgentRequestSchema = z.object({
  projectData: z.object({}).passthrough(), // Allow any project data structure
  selectedModel: z.string().optional(), // Optional model selection
  selectedExperts: z.array(z.string()).min(1), // Required array of expert slugs
});

/**
 * AI Venture Agent Analysis Response
 */
interface VentureAgentResponse {
  analysis: MultiExpertAnalysisResult;
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
  const { projectData, selectedModel, selectedExperts } = validatedData;

  try {
    // Найти данные о выбранных экспертах
    const selectedExpertsData = selectedExperts.map(slug => {
      const expert = investmentExperts.find(e => e.slug === slug);
      if (!expert) {
        throw new APIError(`Expert with slug "${slug}" not found`, 400);
      }
      return expert;
    });

    // Create prompt with project data and experts data
    const prompt = getPromptWithVariables('MULTI_EXPERT_VENTURE_ANALYSIS', {
      PROJECT_DATA: JSON.stringify(projectData, null, 2),
      EXPERTS_DATA: JSON.stringify(selectedExpertsData, null, 2),
    });

    // Generate multi-expert analysis with validation and retry
    const {
      result: analysis,
      attempts,
      model,
    } = await generateMultiExpertAnalysis(prompt, selectedModel as AvailableModel);

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
