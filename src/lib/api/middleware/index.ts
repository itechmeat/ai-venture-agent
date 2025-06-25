/**
 * API Middleware exports
 * Centralized exports for all API middleware functions
 */

// CORS middleware
export { corsMiddleware, successHeaders, errorHeaders } from './cors';

// Authentication middleware
export { APIError } from './auth';

// Base handler and utilities
export {
  createAPIHandler,
  createAPIResponse,
  createAPIErrorResponse,
  type APIResponse,
  type APIContext,
  type APIHandler,
} from '../base-handler';

// API Client utilities
export {
  APIClient,
  handleAPIResponse,
  type APIRequestOptions,
  type APIClientResponse,
} from '../../../utils/api';
