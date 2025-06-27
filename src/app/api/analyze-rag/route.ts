import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateRagAnalysis } from '@/lib/api/ai-utils';
import { APIError } from '@/lib/api/middleware/auth';
import investmentExperts from '@/data/investment_experts.json';
import type { InvestmentExpert } from '@/types/expert';
import type { AvailableModel } from '@/types/ai';
import { AVAILABLE_MODELS } from '@/types/ai';

// Validation schema for RAG analysis request
const ragAnalysisRequestSchema = z.object({
  projectData: z.record(z.unknown()),
  expertSlug: z.string(),
  selectedModel: z.enum(AVAILABLE_MODELS),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validatedData = ragAnalysisRequestSchema.parse(body);
    const { projectData, expertSlug, selectedModel } = validatedData;

    // Find the expert
    const expert = investmentExperts.find(e => e.slug === expertSlug) as InvestmentExpert | undefined;
    if (!expert) {
      throw new APIError(`Expert with slug "${expertSlug}" not found`, 404);
    }

    // Verify it's a RAG expert
    if (!expert.isRagExpert) {
      throw new APIError(`Expert "${expertSlug}" is not a RAG expert`, 400);
    }

    // Perform RAG analysis
    const startTime = Date.now();
    const ragResult = await generateRagAnalysis(projectData, selectedModel as AvailableModel);
    const processingTime = Date.now() - startTime;

    // Format response
    const response = {
      success: true,
      data: {
        expert_slug: expertSlug,
        expert_name: expert.name,
        analysis: ragResult.result,
        metadata: {
          processingTime,
          attempts: ragResult.attempts,
          model: ragResult.model,
          ragContextChunks: ragResult.result.rag_metadata?.searchResults || 0,
          ragTokens: ragResult.result.rag_metadata?.totalTokens || 0,
        },
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('RAG analysis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    if (error instanceof APIError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}