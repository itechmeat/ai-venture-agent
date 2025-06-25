/**
 * CORS middleware for API routes
 * Provides standardized CORS headers for all API endpoints
 */

/**
 * Returns standardized CORS headers for API responses
 * @returns Object with CORS headers
 */
export const corsMiddleware = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
});

/**
 * Headers for successful API responses with CORS
 */
export const successHeaders = corsMiddleware();

/**
 * Headers for error API responses with CORS
 */
export const errorHeaders = corsMiddleware();
