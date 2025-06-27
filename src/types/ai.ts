/**
 * Types for AI content generation
 */

import { z } from 'zod';

// Request types
export interface GenerateContentRequest {
  prompt: string;
}

// Response types
export interface GenerateContentResponse {
  success: boolean;
  result?: string;
  error?: string;
  metadata?: {
    processingTime?: number;
    promptLength?: number;
  };
}

// AI Venture Agent Decision Types
export interface VentureAgentDecision {
  decision: 'INVEST' | 'PASS';
  investment_percentage: number;
  reasoning: string;
  confidence_score: number;
}

export interface VentureAgentUnifiedAnalysis {
  milestone_execution: string;
  scoring_dynamics: string;
  team_competency: string;
  market_potential: string;
  risk_factors: string;
}

export interface VentureAgentStrategies {
  conservative: VentureAgentDecision;
  growth: VentureAgentDecision;
  balanced: VentureAgentDecision;
}

export interface VentureAgentRecommendation {
  best_strategy: 'conservative' | 'growth' | 'balanced' | 'none';
  reasoning: string;
  overall_confidence: number;
}

export interface VentureAgentAnalysisResult {
  unified_analysis: VentureAgentUnifiedAnalysis;
  strategies: VentureAgentStrategies;
  recommendation: VentureAgentRecommendation;
}

// Analysis status for async processing
export type AnalysisStatus = 'pending' | 'loading' | 'completed' | 'error';

export interface ExpertAnalysisResult {
  expert_slug: string;
  expert_name: string;
  analysis: VentureAgentAnalysisResult;
  status?: AnalysisStatus;
  error?: string;
  metadata?: {
    processingTime?: number;
    attempts?: number;
    model?: string;
  };
}

export interface MultiExpertAnalysisResult {
  expert_analyses: ExpertAnalysisResult[];
}

// Zod schemas for validation
export const VentureAgentDecisionSchema = z.object({
  decision: z.enum(['INVEST', 'PASS']),
  investment_percentage: z.number().min(0).max(100),
  reasoning: z.string().min(1),
  confidence_score: z.number().min(0).max(100),
});

export const VentureAgentUnifiedAnalysisSchema = z.object({
  milestone_execution: z.string().min(1),
  scoring_dynamics: z.string().min(1),
  team_competency: z.string().min(1),
  market_potential: z.string().min(1),
  risk_factors: z.string().min(1),
});

export const VentureAgentStrategiesSchema = z.object({
  conservative: VentureAgentDecisionSchema,
  growth: VentureAgentDecisionSchema,
  balanced: VentureAgentDecisionSchema,
});

export const VentureAgentRecommendationSchema = z.object({
  best_strategy: z.enum(['conservative', 'growth', 'balanced', 'none']),
  reasoning: z.string().min(1),
  overall_confidence: z.number().min(0).max(100),
});

export const VentureAgentAnalysisResultSchema = z.object({
  unified_analysis: VentureAgentUnifiedAnalysisSchema,
  strategies: VentureAgentStrategiesSchema,
  recommendation: VentureAgentRecommendationSchema,
});

// Legacy schema for completed analyses (used by existing AI generation)
export const LegacyExpertAnalysisResultSchema = z.object({
  expert_slug: z.string().min(1),
  expert_name: z.string().min(1),
  analysis: VentureAgentAnalysisResultSchema,
});

export const LegacyMultiExpertAnalysisResultSchema = z.object({
  expert_analyses: z.array(LegacyExpertAnalysisResultSchema),
});

// New schema for async analyses (with optional analysis and status)
export const ExpertAnalysisResultSchema = z.object({
  expert_slug: z.string().min(1),
  expert_name: z.string().min(1),
  analysis: VentureAgentAnalysisResultSchema.optional(),
  status: z.enum(['pending', 'loading', 'completed', 'error']).optional(),
  error: z.string().optional(),
  metadata: z
    .object({
      processingTime: z.number().optional(),
      attempts: z.number().optional(),
      model: z.string().optional(),
    })
    .optional(),
});

export const MultiExpertAnalysisResultSchema = z.object({
  expert_analyses: z.array(ExpertAnalysisResultSchema),
});

// Project data generation types
export interface ProjectDataFromAI {
  name: string;
  description: string;
  slogan?: string;
  status?:
    | 'idea'
    | 'concept'
    | 'prototype'
    | 'mvp'
    | 'beta'
    | 'launched'
    | 'growing'
    | 'scaling'
    | 'established'
    | 'acquired'
    | 'closed';
  country?: string;
  city?: string;
  team?: TeamMemberFromAI[];
}

// Team member data extracted from AI
export interface TeamMemberFromAI {
  name: string;
  email?: string;
  positions: string[];
  bio?: string;
  city?: string;
  country?: string;
  professional_background?: string;
  startup_ecosystem_role?: string;
  website_url?: string;
  x_username?: string;
  linkedin_username?: string;
  github_username?: string;
  telegram_username?: string;
}

// Gemini API types (reused from transcribe)
export interface GeminiGenerateRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
  };
}

export interface GeminiGenerateResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  error?: {
    message: string;
    code?: number;
  };
}

// OpenRouter API types
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

// AI Provider types
export type AIProvider = 'gemini' | 'openrouter';

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

// Constants
export const AI_TIMEOUT = 120000; // 2 minutes
export const MAX_PROMPT_LENGTH = 50000; // 50k characters

// Model configurations
export const AI_MODELS = {
  // Google Gemini (Free via direct API)
  GEMINI_FLASH: 'gemini-2.0-flash',

  // OpenRouter models
  GEMINI_25_FLASH: 'google/gemini-2.5-flash', // $0.30/M input, $2.50/M output, $1.238/K input imgs
  GROK_3: 'x-ai/grok-3', // $3/M input, $15/M output
  MINIMAX_01: 'minimax/minimax-01', // $0.20/M input, $1.10/M output
  // MINIMAX_M1: 'minimax/minimax-m1', // $0.30/M input, $1.65M output
  // MISTRAL_SMALL_32: 'mistralai/mistral-small-3.2-24b-instruct:free', // Free
  MAI_DS_R1: 'microsoft/mai-ds-r1:free', // Free
  DEEPSEEK_R1_0528: 'deepseek/deepseek-r1-0528:free', // Free
  // CLAUDE_SONNET_4: 'anthropic/claude-sonnet-4', // $3/M input, $15/M output, $4.80/K input imgs
  // PHI_4_REASONING_PLUS: 'microsoft/phi-4-reasoning-plus:free', // Free
  // QWEN3_30B_A3B: 'qwen/qwen3-30b-a3b:free', // Free
  // O4_MINI_HIGH: 'openai/o4-mini-high', // $1.10/M input, $4.40/M output, $0.842/K input imgs
} as const;

// Model display names for UI
export const MODEL_DISPLAY_NAMES = {
  [AI_MODELS.GEMINI_FLASH]: 'Gemini 2.0 Flash (Google)',
  [AI_MODELS.GEMINI_25_FLASH]: 'Gemini 2.5 Flash (OpenRouter)',
  [AI_MODELS.GROK_3]: 'Grok 3 (OpenRouter)',
  [AI_MODELS.MINIMAX_01]: 'MiniMax-01 (OpenRouter)',
  // [AI_MODELS.MINIMAX_M1]: 'minimax/minimax-m1 (OpenRouter)',
  [AI_MODELS.MAI_DS_R1]: 'MAI DS R1 (OpenRouter, 0)',
  // [AI_MODELS.MISTRAL_SMALL_32]: 'Mistral Small 3.2 24B (OpenRouter, 0)',
  [AI_MODELS.DEEPSEEK_R1_0528]: 'DeepSeek R1 0528 (OpenRouter, 0)',
  // [AI_MODELS.CLAUDE_SONNET_4]: 'Claude Sonnet 4 (OpenRouter)',
  // [AI_MODELS.PHI_4_REASONING_PLUS]: 'Phi 4 Reasoning Plus (OpenRouter, 0)',
  // [AI_MODELS.QWEN3_30B_A3B]: 'Qwen3 30B A3B (OpenRouter, 0)',
  // [AI_MODELS.O4_MINI_HIGH]: 'o4 Mini High (OpenRouter)',
} as const;

// Available models for user selection
export const AVAILABLE_MODELS = [
  AI_MODELS.GEMINI_FLASH,
  AI_MODELS.GEMINI_25_FLASH,
  AI_MODELS.GROK_3,
  AI_MODELS.MINIMAX_01,
  // AI_MODELS.MINIMAX_M1,
  AI_MODELS.MAI_DS_R1,
  // AI_MODELS.MISTRAL_SMALL_32,
  AI_MODELS.DEEPSEEK_R1_0528,
  // AI_MODELS.CLAUDE_SONNET_4,
  // AI_MODELS.PHI_4_REASONING_PLUS,
  // AI_MODELS.QWEN3_30B_A3B,
  // AI_MODELS.O4_MINI_HIGH,
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number];

// Validation error details
export interface ValidationError {
  field: string;
  message: string;
  received?: unknown;
}

// RAG Analysis Types
export interface RagContext {
  content: string;
  source: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface RagAnalysisResult {
  context: RagContext[];
  totalTokens: number;
  processingTime: number;
  searchResults: number;
}

export interface RagExpertAnalysisResult extends VentureAgentAnalysisResult {
  rag_context: RagContext[];
  rag_metadata: {
    searchResults: number;
    totalTokens: number;
    processingTime: number;
    contextRelevant: boolean;
  };
}

// RAG Expert Configuration
export interface RagExpertConfig {
  isRagExpert: true;
  ragConfig: {
    topK: number;
    scoreThreshold: number;
    maxContextLength: number;
  };
}

// Extended Expert Analysis Result for RAG
export interface RagExpertAnalysis extends ExpertAnalysisResult {
  analysis: RagExpertAnalysisResult;
  expert_type: 'rag';
}

// Zod schemas for RAG validation
export const RagContextSchema = z.object({
  content: z.string().min(1),
  source: z.string().min(1),
  score: z.number().min(0).max(1),
  metadata: z.record(z.unknown()).optional(),
});

export const RagAnalysisResultSchema = z.object({
  context: z.array(RagContextSchema),
  totalTokens: z.number().min(0),
  processingTime: z.number().min(0),
  searchResults: z.number().min(0),
});

export const RagExpertAnalysisResultSchema = VentureAgentAnalysisResultSchema.extend({
  rag_context: z.array(RagContextSchema),
  rag_metadata: z.object({
    searchResults: z.number().min(0),
    totalTokens: z.number().min(0),
    processingTime: z.number().min(0),
    contextRelevant: z.boolean(),
  }),
});
