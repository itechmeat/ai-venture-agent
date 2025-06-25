/**
 * Application configuration and environment-specific settings
 * Contains feature flags, environment variables, and runtime configuration
 */

/**
 * Environment configuration
 */
export const ENV_CONFIG = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // External API keys
  apis: {
    gemini: process.env.GEMINI_API_KEY,
  },

  // Application URLs
  urls: {
    app: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100',
    api: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100/api',
  },
} as const;

/**
 * Feature flags for enabling/disabling functionality
 */
export const FEATURE_FLAGS = {
  // AI features
  aiContentGeneration: true,
  audioTranscription: true,

  // Development features
  debugMode: ENV_CONFIG.isDevelopment,
  verboseLogging: ENV_CONFIG.isDevelopment,

  // Experimental features
  experimentalFeatures: ENV_CONFIG.isDevelopment,
} as const;

/**
 * Security configuration
 */
export const SECURITY_CONFIG = {
  // CORS settings
  cors: {
    allowedOrigins: ENV_CONFIG.isProduction
      ? [ENV_CONFIG.urls.app]
      : ['http://localhost:3100', 'http://127.0.0.1:3100'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
    maxAge: 86400, // 24 hours
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: ENV_CONFIG.isProduction ? 100 : 1000,
  },

  // File upload security
  upload: {
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'text/plain',
      'text/markdown',
      'audio/mpeg',
      'audio/wav',
    ],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    scanForViruses: ENV_CONFIG.isProduction,
  },
} as const;

/**
 * Logging configuration
 */
export const LOGGING_CONFIG = {
  level: ENV_CONFIG.isProduction ? 'error' : 'debug',

  // Log destinations
  destinations: {
    console: true,
    file: ENV_CONFIG.isProduction,
    external: ENV_CONFIG.isProduction, // e.g., Sentry, LogRocket
  },

  // Log formatting
  format: ENV_CONFIG.isProduction ? 'json' : 'pretty',

  // Performance logging
  performance: {
    logSlowQueries: true,
    slowQueryThreshold: 1000, // 1 second
    logApiResponseTimes: true,
  },
} as const;

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  // Redis configuration (if used)
  redis: {
    enabled: ENV_CONFIG.isProduction,
    url: process.env.REDIS_URL,
    ttl: 3600, // 1 hour default TTL
  },

  // In-memory cache
  memory: {
    maxSize: 100, // Maximum number of items
    ttl: 300000, // 5 minutes
  },

  // Browser cache
  browser: {
    staticAssets: 31536000, // 1 year
    apiResponses: 300, // 5 minutes
  },
} as const;

/**
 * Monitoring and analytics configuration
 */
export const MONITORING_CONFIG = {
  // Error tracking
  sentry: {
    enabled: ENV_CONFIG.isProduction,
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
  },

  // Analytics
  analytics: {
    enabled: ENV_CONFIG.isProduction,
    googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
  },

  // Performance monitoring
  performance: {
    enabled: true,
    sampleRate: ENV_CONFIG.isProduction ? 0.1 : 1.0, // 10% in production, 100% in development
  },
} as const;

/**
 * Email configuration
 */
export const EMAIL_CONFIG = {
  // SMTP settings
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },

  // Email templates
  templates: {
    welcome: 'welcome',
    resetPassword: 'reset-password',
    projectInvite: 'project-invite',
  },

  // Sender information
  from: {
    name: 'DeepVest',
    email: process.env.FROM_EMAIL || 'noreply@deepvest.com',
  },
} as const;

/**
 * Development-specific configuration
 */
export const DEV_CONFIG = {
  // Mock data
  useMockData: ENV_CONFIG.isDevelopment && process.env.USE_MOCK_DATA === 'true',

  // Debug tools
  showDebugInfo: ENV_CONFIG.isDevelopment,
  enableHotReload: ENV_CONFIG.isDevelopment,

  // Testing
  skipAuth: ENV_CONFIG.isTest,
  fastMode: ENV_CONFIG.isTest, // Skip delays in tests
} as const;
