import { NextResponse } from 'next/server';
import type { StartupListResponse } from '@/types';
import type { APIResponse } from '@/lib/api/base-handler';

export async function GET(): Promise<NextResponse<APIResponse<StartupListResponse['data']>>> {
  const startTime = Date.now();

  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Fetch startups from DeepVest API
    const response = await fetch('https://deepvest.pro/api/projects', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DeepVest API error: ${response.status} ${response.statusText}`);
    }

    const deepVestData: StartupListResponse = await response.json();

    if (!deepVestData.success) {
      throw new Error('DeepVest API returned unsuccessful response');
    }

    const projectsLimit = parseInt(process.env.DEEPVEST_PROJECTS_LIMIT || '0', 10);
    const shouldLimitProjects = projectsLimit > 0;

    const projects = shouldLimitProjects
      ? deepVestData.data.projects.slice(-projectsLimit)
      : deepVestData.data.projects;

    const processingTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...deepVestData.data,
          projects,
        },
        metadata: {
          processingTime,
          totalProjects: projects.length,
          originalTotalProjects: deepVestData.data.projects.length,
          limited: shouldLimitProjects,
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

    console.error('Error fetching startups:', errorMessage);

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
