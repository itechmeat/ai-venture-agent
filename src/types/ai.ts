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
  best_strategy: 'conservative' | 'growth' | 'balanced';
  reasoning: string;
  overall_confidence: number;
}

export interface VentureAgentAnalysisResult {
  unified_analysis: VentureAgentUnifiedAnalysis;
  strategies: VentureAgentStrategies;
  recommendation: VentureAgentRecommendation;
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
  best_strategy: z.enum(['conservative', 'growth', 'balanced']),
  reasoning: z.string().min(1),
  overall_confidence: z.number().min(0).max(100),
});

export const VentureAgentAnalysisResultSchema = z.object({
  unified_analysis: VentureAgentUnifiedAnalysisSchema,
  strategies: VentureAgentStrategiesSchema,
  recommendation: VentureAgentRecommendationSchema,
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

// Constants
export const AI_TIMEOUT = 120000; // 2 minutes
export const MAX_PROMPT_LENGTH = 50000; // 50k characters

// Validation error details
export interface ValidationError {
  field: string;
  message: string;
  received?: unknown;
}
