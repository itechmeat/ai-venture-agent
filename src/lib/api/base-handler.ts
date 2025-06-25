/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware } from './middleware/cors';
import { APIError } from './middleware/auth';

/**
 * Standard API response interface
 * All API endpoints should return this format
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    processingTime: number;
    [key: string]: any;
  };
}

/**
 * Context object passed to API handlers
 */
export interface APIContext {
  params?: Record<string, string>;
  [key: string]: any;
}

/**
 * Next.js 15 route context type
 */
export interface RouteContext {
  params?: Promise<Record<string, string>>;
}

/**
 * API handler function type
 */
export type APIHandler<T = any> = (request: NextRequest, context?: APIContext) => Promise<T>;

/**
 * Creates a standardized API handler for routes WITHOUT params
 * Overload for handlers that don't need the request object
 */
export function createAPIHandler<T = any>(
  handler: () => Promise<T>,
): (request: NextRequest) => Promise<NextResponse>;

/**
 * Creates a standardized API handler for routes WITHOUT params
 * Overload for handlers that need the request object
 */
export function createAPIHandler<T = any>(
  handler: (request: NextRequest) => Promise<T>,
): (request: NextRequest) => Promise<NextResponse>;

/**
 * Implementation of createAPIHandler
 */
export function createAPIHandler<T = any>(
  handler: (request: NextRequest, params?: any) => Promise<T>,
) {
  return async (request: NextRequest, context?: any) => {
    const startTime = Date.now();

    try {
      // Handle CORS
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsMiddleware() });
      }

      const result = await handler(request, context?.params);

      return NextResponse.json({ success: true, data: result }, { headers: corsMiddleware() });
    } catch (error) {
      console.error('API Error:', error);

      const status = error instanceof APIError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'Unknown error';

      return NextResponse.json(
        {
          success: false,
          error: message,
          metadata: { processingTime: Date.now() - startTime },
        },
        { status, headers: corsMiddleware() },
      );
    }
  };
}

/**
 * Creates a standardized API handler for routes WITH params
 *
 * @param handler - The actual API logic function that receives params
 * @returns NextJS API route handler for routes with params
 */
export function createAPIHandlerWithParams<T = any>(
  handler: (request: NextRequest, params: Record<string, string>) => Promise<T>,
) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    const startTime = Date.now();

    try {
      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return NextResponse.json(null, {
          status: 200,
          headers: corsMiddleware(),
        });
      }

      // Resolve params (Next.js 15 async params)
      const resolvedParams = await context.params;

      // Execute the handler
      const result = await handler(request, resolvedParams || {});

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Return successful response
      const response: APIResponse<T> = {
        success: true,
        data: result,
        metadata: {
          processingTime,
        },
      };

      return NextResponse.json(response, {
        status: 200,
        headers: corsMiddleware(),
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Log error for debugging
      console.error('[API Error]', {
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTime,
      });

      // Determine error status and message
      let status = 500;
      let message = 'Internal server error';
      let code: string | undefined;

      if (error instanceof APIError) {
        status = error.status;
        message = error.message;
        code = error.code;
      } else if (error instanceof Error) {
        message = error.message;
      }

      // Return error response
      const errorResponse: APIResponse = {
        success: false,
        error: message,
        metadata: {
          processingTime,
          ...(code && { code }),
        },
      };

      return NextResponse.json(errorResponse, {
        status,
        headers: corsMiddleware(),
      });
    }
  };
}

/**
 * Utility function to create API responses manually
 * Useful for complex handlers that need custom response logic
 *
 * @param data - Response data
 * @param options - Additional response options
 * @returns NextResponse with standardized format
 */
export function createAPIResponse<T>(
  data: T,
  options: {
    status?: number;
    metadata?: Record<string, any>;
  } = {},
): NextResponse {
  const response: APIResponse<T> = {
    success: true,
    data,
    metadata: options.metadata
      ? {
          processingTime: 0, // Default value for manual responses
          ...options.metadata,
        }
      : undefined,
  };

  return NextResponse.json(response, {
    status: options.status || 200,
    headers: corsMiddleware(),
  });
}

/**
 * Utility function to create API error responses manually
 *
 * @param message - Error message
 * @param status - HTTP status code
 * @param code - Optional error code
 * @param metadata - Additional metadata
 * @returns NextResponse with error format
 */
export function createAPIErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  metadata?: Record<string, any>,
): NextResponse {
  const response: APIResponse = {
    success: false,
    error: message,
    metadata:
      metadata || code
        ? {
            processingTime: 0, // Default value for manual responses
            ...metadata,
            ...(code && { code }),
          }
        : undefined,
  };

  return NextResponse.json(response, {
    status,
    headers: corsMiddleware(),
  });
}
