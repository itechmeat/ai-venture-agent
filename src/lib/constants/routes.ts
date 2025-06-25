/**
 * Application routes constants
 * Centralized route definitions for consistent navigation
 */

/**
 * Public page routes
 */
export const ROUTES = {
  home: '/',
} as const;

/**
 * API routes for client-side requests
 */
export const routes = {
  api: {
    // AI Venture Agent services
    makeDecision: '/api/make-decision',

    // Startup data
    startups: '/api/startups',
    startupFull: (id: string) => `/api/startups/${id}/full`,
  },
} as const;

// Legacy export for backward compatibility
export const API_ROUTES = routes.api;

/**
 * Route validation patterns
 */
export const ROUTE_PATTERNS = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  slug: /^[a-z0-9-]+$/,
  username: /^[a-zA-Z0-9_-]+$/,
} as const;

/**
 * Navigation menu structure
 */
export const NAVIGATION = {
  main: [{ label: 'Home', href: ROUTES.home }],
} as const;
