import { NextResponse } from 'next/server';
import type { APIResponse } from '@/lib/api/base-handler';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<APIResponse>> {
  const startTime = Date.now();

  try {
    const { id } = await params;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Fetch full startup data from DeepVest API
    const response = await fetch(`https://deepvest.pro/api/projects/${id}/full`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DeepVest API error: ${response.status} ${response.statusText}`);
    }

    const startupData = await response.json();

    const processingTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: startupData,
        metadata: {
          processingTime,
          projectId: id,
        },
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    console.error('Error fetching startup full data:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        metadata: {
          processingTime,
        },
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
