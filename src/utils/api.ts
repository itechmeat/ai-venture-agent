/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIResponse } from '@/lib/api/base-handler';

/**
 * Configuration options for API requests
 */
export interface APIRequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * API Client response type
 */
export interface APIClientResponse<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * API Client for making HTTP requests to internal API endpoints
 * Provides standardized error handling and response formatting
 */
export class APIClient {
  private static baseUrl = '/api';
  private static defaultTimeout = 30000; // 30 seconds
  private static defaultRetries = 0;
  private static defaultRetryDelay = 1000; // 1 second

  /**
   * Makes a generic HTTP request to an API endpoint
   *
   * @param endpoint - API endpoint path (without /api prefix)
   * @param options - Request options including timeout and retries
   * @returns Promise with standardized response format
   */
  static async request<T>(
    endpoint: string,
    options: APIRequestOptions = {},
  ): Promise<APIClientResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      ...requestOptions
    } = options;

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...requestOptions.headers,
          },
          credentials: 'include',
          signal: controller.signal,
          ...requestOptions,
        });

        clearTimeout(timeoutId);

        // Parse response
        let responseData: APIResponse<T>;
        try {
          responseData = await response.json();
        } catch (parseError) {
          console.error('[APIClient] Failed to parse response JSON:', parseError);
          return {
            data: null,
            error: 'Invalid response format',
            success: false,
          };
        }

        // Handle API response format
        if (responseData.success) {
          return {
            data: responseData.data || null,
            error: null,
            success: true,
            metadata: responseData.metadata,
          };
        } else {
          return {
            data: null,
            error: responseData.error || 'Request failed',
            success: false,
            metadata: responseData.metadata,
          };
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            return {
              data: null,
              error: 'Request timeout',
              success: false,
            };
          }

          // Don't retry on client errors (4xx)
          if (
            'status' in error &&
            typeof error.status === 'number' &&
            error.status >= 400 &&
            error.status < 500
          ) {
            break;
          }
        }

        // Wait before retry (except on last attempt)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // All retries failed
    return {
      data: null,
      error: lastError?.message || 'Network error',
      success: false,
    };
  }

  /**
   * Makes a GET request to an API endpoint
   *
   * @param endpoint - API endpoint path
   * @param options - Request options
   * @returns Promise with response data
   */
  static async get<T>(
    endpoint: string,
    options: Omit<APIRequestOptions, 'method' | 'body'> = {},
  ): Promise<APIClientResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * Makes a POST request to an API endpoint
   *
   * @param endpoint - API endpoint path
   * @param data - Request body data
   * @param options - Request options
   * @returns Promise with response data
   */
  static async post<T>(
    endpoint: string,
    data?: any,
    options: Omit<APIRequestOptions, 'method' | 'body'> = {},
  ): Promise<APIClientResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Makes a PUT request to an API endpoint
   *
   * @param endpoint - API endpoint path
   * @param data - Request body data
   * @param options - Request options
   * @returns Promise with response data
   */
  static async put<T>(
    endpoint: string,
    data?: any,
    options: Omit<APIRequestOptions, 'method' | 'body'> = {},
  ): Promise<APIClientResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Makes a PATCH request to an API endpoint
   *
   * @param endpoint - API endpoint path
   * @param data - Request body data
   * @param options - Request options
   * @returns Promise with response data
   */
  static async patch<T>(
    endpoint: string,
    data?: any,
    options: Omit<APIRequestOptions, 'method' | 'body'> = {},
  ): Promise<APIClientResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Makes a DELETE request to an API endpoint
   *
   * @param endpoint - API endpoint path
   * @param options - Request options
   * @returns Promise with response data
   */
  static async delete<T>(
    endpoint: string,
    options: Omit<APIRequestOptions, 'method' | 'body'> = {},
  ): Promise<APIClientResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Upload files to an API endpoint
   *
   * @param endpoint - API endpoint path
   * @param formData - FormData containing files and other data
   * @param options - Request options (Content-Type will be automatically set)
   * @returns Promise with response data
   */
  static async upload<T>(
    endpoint: string,
    formData: FormData,
    options: Omit<APIRequestOptions, 'method' | 'body' | 'headers'> = {},
  ): Promise<APIClientResponse<T>> {
    const { headers, ...restOptions } = options as APIRequestOptions;

    return this.request<T>(endpoint, {
      ...restOptions,
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let browser set it with boundary
        ...headers,
      },
    });
  }
}

/**
 * Utility function to handle API responses with error handling
 * Useful for React components that need to handle API responses
 *
 * @param apiCall - Function that returns an API response
 * @param onSuccess - Callback for successful responses
 * @param onError - Callback for error responses
 */
export async function handleAPIResponse<T>(
  apiCall: () => Promise<APIClientResponse<T>>,
  onSuccess?: (data: T) => void,
  onError?: (error: string) => void,
): Promise<void> {
  try {
    const response = await apiCall();

    if (response.success && response.data) {
      onSuccess?.(response.data);
    } else {
      onError?.(response.error || 'Unknown error occurred');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    onError?.(message);
  }
}
