/**
 * Custom error class for API authentication errors
 */
export class APIError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = 'APIError';
  }
}
