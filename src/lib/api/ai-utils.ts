import { APIError } from './middleware/auth';
import { executeAIAnalysisWithRetry } from './gemini-utils';
import {
  VentureAgentAnalysisResult,
  GeminiGenerateRequest,
  GeminiGenerateResponse,
  OpenRouterRequest,
  OpenRouterResponse,
  AIProviderConfig,
  AI_TIMEOUT,
  AI_MODELS,
  AvailableModel,
} from '@/types/ai';
import { enforceStrictJSONForModel } from '@/lib/prompts';

// Conditional logging helper
const shouldLog = () => process.env.NEXT_PUBLIC_LOGS === 'true';
const log = (...args: unknown[]) => shouldLog() && console.log(...args);
const logError = (...args: unknown[]) => shouldLog() && console.error(...args);

/**
 * Generate analysis using Gemini API
 */
async function generateWithGemini(
  prompt: string,
  apiKey: string,
): Promise<{ result: VentureAgentAnalysisResult; attempts: number }> {
  const geminiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  // Применяем ужесточение промпта для Gemini
  const enhancedPrompt = enforceStrictJSONForModel(prompt, AI_MODELS.GEMINI_FLASH);

  let attemptCount = 0;

  const makeAPICall = async (): Promise<string> => {
    attemptCount++;

    const requestBody: GeminiGenerateRequest = {
      contents: [
        {
          parts: [
            {
              text: enhancedPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

    try {
      const response = await fetch(`${geminiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new APIError(`Gemini API error: ${response.status} ${response.statusText}`, 500);
      }

      const data: GeminiGenerateResponse = await response.json();

      if (data.error) {
        throw new APIError(`Gemini API error: ${data.error.message}`, 500);
      }

      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const resultText = candidate.content.parts[0].text;
          if (resultText) {
            return resultText.trim();
          }
        }
      }

      throw new APIError('No content generated from Gemini API', 500);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new APIError('Gemini API request timeout', 408);
        }
        throw new APIError(`Gemini API error: ${error.message}`, 500);
      }
      throw new APIError('Failed to generate content with Gemini API', 500);
    }
  };

  const result = await executeAIAnalysisWithRetry(makeAPICall);
  return { result, attempts: attemptCount };
}

/**
 * Generate analysis using OpenRouter API
 */
async function generateWithOpenRouter(
  prompt: string,
  config: { apiKey: string; model: string },
): Promise<{ result: VentureAgentAnalysisResult; attempts: number }> {
  const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

  // Применяем ужесточение промпта для проблемных моделей
  const enhancedPrompt = enforceStrictJSONForModel(prompt, config.model);

  log('[OpenRouter] Starting analysis with config:', {
    model: config.model,
    modelRequested: config.model,
    apiKeyLength: config.apiKey?.length || 0,
    promptLength: enhancedPrompt.length,
    originalPromptLength: prompt.length,
    promptEnhanced: enhancedPrompt.length > prompt.length,
    url: openRouterUrl,
  });

  log(`[OpenRouter] 🤖 REQUESTING MODEL: ${config.model}`);

  let attemptCount = 0;

  const makeAPICall = async (): Promise<string> => {
    attemptCount++;
    log(`[OpenRouter] Attempt ${attemptCount} starting...`);

    const requestBody: OpenRouterRequest = {
      model: config.model,
      messages: [
        {
          role: 'user',
          content: enhancedPrompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    };

    log('[OpenRouter] Request body prepared:', {
      model: requestBody.model,
      modelInRequest: requestBody.model,
      messageCount: requestBody.messages.length,
      temperature: requestBody.temperature,
      maxTokens: requestBody.max_tokens,
      firstMessageLength: requestBody.messages[0]?.content?.length || 0,
    });

    log(`[OpenRouter] 📤 REQUEST PAYLOAD MODEL: ${requestBody.model}`);

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'AI Venture Agent',
    };

    log('[OpenRouter] Headers prepared:', {
      'Content-Type': headers['Content-Type'],
      Authorization: `Bearer ${config.apiKey.substring(0, 8)}...`,
      'HTTP-Referer': headers['HTTP-Referer'],
      'X-Title': headers['X-Title'],
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

    try {
      log('[OpenRouter] Making API request...');
      const response = await fetch(openRouterUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      log('[OpenRouter] Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logError('[OpenRouter] API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        throw new APIError(
          `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`,
          500,
        );
      }

      const data: OpenRouterResponse = await response.json();
      log('[OpenRouter] Response data:', {
        id: data.id,
        model: data.model,
        modelInResponse: data.model,
        choicesCount: data.choices?.length || 0,
        usage: data.usage,
        hasError: !!data.error,
        errorMessage: data.error?.message,
      });

      log(`[OpenRouter] 📥 RESPONSE FROM MODEL: ${data.model || 'UNKNOWN'}`);

      if (data.error) {
        logError('[OpenRouter] API returned error:', data.error);
        throw new APIError(`OpenRouter API error: ${data.error.message}`, 500);
      }

      if (data.choices && data.choices.length > 0) {
        const choice = data.choices[0];
        log('[OpenRouter] First choice:', {
          index: choice.index,
          finishReason: choice.finish_reason,
          messageRole: choice.message?.role,
          contentLength: choice.message?.content?.length || 0,
          contentPreview: choice.message?.content?.substring(0, 200) + '...',
        });

        if (choice.message && choice.message.content) {
          log('[OpenRouter] Successfully got content, length:', choice.message.content.length);
          return choice.message.content.trim();
        }
      }

      logError('[OpenRouter] No valid content in response:', data);
      throw new APIError('No content generated from OpenRouter API', 500);
    } catch (error) {
      clearTimeout(timeoutId);

      logError('[OpenRouter] Request failed:', {
        error: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof APIError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new APIError('OpenRouter API request timeout', 408);
        }
        throw new APIError(`OpenRouter API error: ${error.message}`, 500);
      }
      throw new APIError('Failed to generate content with OpenRouter API', 500);
    }
  };

  const result = await executeAIAnalysisWithRetry(makeAPICall);
  log('[OpenRouter] Analysis completed successfully after', attemptCount, 'attempts');
  return { result, attempts: attemptCount };
}

/**
 * Get AI provider configuration based on selected model
 */
export function getAIProviderConfig(selectedModel?: AvailableModel): AIProviderConfig {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  log('[AI Provider] Checking available API keys:', {
    hasOpenRouterKey: !!openRouterKey,
    hasGeminiKey: !!geminiKey,
    openRouterKeyLength: openRouterKey?.length || 0,
    geminiKeyLength: geminiKey?.length || 0,
  });

  // Default to Gemini if no model selected
  const model = selectedModel || AI_MODELS.GEMINI_FLASH;

  // Determine provider based on model
  if (model === AI_MODELS.GEMINI_FLASH) {
    if (!geminiKey) {
      throw new APIError('Gemini API key not configured', 500);
    }
    const config = {
      provider: 'gemini' as const,
      model,
      apiKey: geminiKey,
    };
    log('[AI Provider] Selected Gemini with config:', {
      provider: config.provider,
      model: config.model,
      apiKeyPrefix: config.apiKey.substring(0, 8) + '...',
    });
    return config;
  } else {
    // All other models use OpenRouter
    if (!openRouterKey) {
      throw new APIError('OpenRouter API key not configured', 500);
    }
    const config = {
      provider: 'openrouter' as const,
      model,
      apiKey: openRouterKey,
    };
    log('[AI Provider] Selected OpenRouter with config:', {
      provider: config.provider,
      model: config.model,
      apiKeyPrefix: config.apiKey.substring(0, 8) + '...',
    });
    return config;
  }
}

/**
 * Universal AI analysis generator that works with multiple providers
 */
export async function generateVentureAgentAnalysis(
  prompt: string,
  selectedModel?: AvailableModel,
): Promise<{ result: VentureAgentAnalysisResult; attempts: number; model: string }> {
  log('[AI Analysis] Starting venture agent analysis...', {
    promptLength: prompt.length,
    selectedModel: selectedModel || 'default',
  });

  const providerConfig = getAIProviderConfig(selectedModel);

  log('[AI Analysis] Using provider config:', {
    provider: providerConfig.provider,
    model: providerConfig.model,
  });

  let analysisResult: { result: VentureAgentAnalysisResult; attempts: number };

  try {
    switch (providerConfig.provider) {
      case 'gemini':
        log('[AI Analysis] Delegating to Gemini...');
        analysisResult = await generateWithGemini(prompt, providerConfig.apiKey);
        break;
      case 'openrouter':
        log('[AI Analysis] Delegating to OpenRouter...');
        analysisResult = await generateWithOpenRouter(prompt, {
          apiKey: providerConfig.apiKey,
          model: providerConfig.model,
        });
        break;
      default:
        throw new APIError(`Unsupported AI provider: ${providerConfig.provider}`, 500);
    }

    log('[AI Analysis] Analysis completed successfully:', {
      provider: providerConfig.provider,
      model: providerConfig.model,
      attempts: analysisResult.attempts,
    });

    return {
      ...analysisResult,
      model: providerConfig.model,
    };
  } catch (error) {
    // Более детальное логирование ошибок
    const errorDetails = {
      provider: providerConfig.provider,
      model: providerConfig.model,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      promptLength: prompt.length,
      timestamp: new Date().toISOString(),
    };

    logError('[AI Analysis] Analysis failed with detailed context:', errorDetails);

    // Проверяем если это ошибка парсинга JSON
    if (
      error instanceof Error &&
      (error.message.includes('JSON') ||
        error.message.includes('parse') ||
        error.message.includes('validation') ||
        error.message.includes('Invalid JWT'))
    ) {
      logError(
        '[AI Analysis] JSON/Parsing error detected - this might be due to AI model returning invalid format:',
        {
          errorType: 'JSON_PARSING_ERROR',
          model: providerConfig.model,
          provider: providerConfig.provider,
          errorMessage: error.message,
        },
      );

      // Перебрасываем ошибку с дополнительным контекстом
      throw new APIError(
        `AI model ${providerConfig.model} returned invalid JSON format: ${error.message}. This model may need different prompting strategy.`,
        500,
      );
    }

    throw error;
  }
}
