import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAPIHandler } from '@/lib/api/base-handler';
import { APIError } from '@/lib/api/middleware/auth';
import { generateMultiExpertAnalysis } from '@/lib/api/ai-utils';
import { getPromptWithVariables } from '@/lib/prompts';
import {
  MultiExpertAnalysisResult,
  AvailableModel,
  ExpertAnalysisResult,
  VentureAgentAnalysisResult,
} from '@/types/ai';
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
    ragExpertsCount: number;
    regularExpertsCount: number;
    requiresAsyncProcessing: boolean;
  };
}

/**
 * AI Venture Agent analysis endpoint with async RAG processing
 */
export const POST = createAPIHandler(async (request: NextRequest) => {
  const startTime = Date.now();

  // Parse and validate request body
  const body = await request.json();
  const validatedData = ventureAgentRequestSchema.parse(body);
  const { projectData, selectedModel, selectedExperts } = validatedData;

  try {
    // Find data about selected experts
    const selectedExpertsData = selectedExperts.map(slug => {
      const expert = investmentExperts.find(e => e.slug === slug);
      if (!expert) {
        throw new APIError(`Expert with slug "${slug}" not found`, 400);
      }
      return expert;
    });

    // Separate RAG experts from regular experts
    const ragExperts = selectedExpertsData.filter(expert => expert.isRagExpert === true);
    const regularExperts = selectedExpertsData.filter(expert => !expert.isRagExpert);

    console.log(
      `Processing ${regularExperts.length} regular experts and ${ragExperts.length} RAG experts`,
    );

    // Create initial response with appropriate states
    const expertAnalyses: ExpertAnalysisResult[] = [];

    let attempts = 1;
    let model = selectedModel || 'gemini-2.0-flash';

    // Process regular experts synchronously if any
    if (regularExperts.length > 0) {
      console.log('Processing regular experts synchronously');

      // Create prompt with project data and regular experts data
      const prompt = getPromptWithVariables('MULTI_EXPERT_VENTURE_ANALYSIS', {
        PROJECT_DATA: JSON.stringify(projectData, null, 2),
        EXPERTS_DATA: JSON.stringify(regularExperts, null, 2),
      });

      // Generate multi-expert analysis with validation and retry
      const result = await generateMultiExpertAnalysis(prompt, selectedModel as AvailableModel);

      // Add completed regular expert analyses (transform legacy format to new format)
      result.result.expert_analyses.forEach(expertResult => {
        expertAnalyses.push({
          expert_slug: expertResult.expert_slug,
          expert_name: expertResult.expert_name,
          analysis: expertResult.analysis,
          status: 'completed' as const,
          metadata: {
            processingTime: Date.now() - startTime,
            attempts: result.attempts,
            model: result.model,
          },
        });
      });

      attempts = result.attempts;
      model = result.model;
    }

    // Add RAG experts with pending status - they will be processed asynchronously
    ragExperts.forEach(expert => {
      expertAnalyses.push({
        expert_slug: expert.slug,
        expert_name: expert.name,
        status: 'pending',
        analysis: undefined as unknown as VentureAgentAnalysisResult, // Will be filled by separate API calls
      });
    });

    const processingTime = Date.now() - startTime;

    // Return response with loading states for RAG experts
    const analysis: MultiExpertAnalysisResult = {
      expert_analyses: expertAnalyses,
    };

    return {
      analysis,
      metadata: {
        processingTime,
        attempts,
        model,
        ragExpertsCount: ragExperts.length,
        regularExpertsCount: regularExperts.length,
        requiresAsyncProcessing: ragExperts.length > 0,
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
