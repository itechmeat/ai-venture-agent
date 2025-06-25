# AI Provider Setup and Troubleshooting

## Environment Variables

Create a `.env.local` file in the root directory with:

```bash
# OpenRouter API Key (recommended for testing)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Gemini API Key (fallback)
GEMINI_API_KEY=your_gemini_api_key_here

# Site URL for OpenRouter (optional)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Enable detailed logging (optional)
NEXT_PUBLIC_LOGS=true
```

## Getting API Keys

### OpenRouter

1. Go to [OpenRouter](https://openrouter.ai/keys)
2. Sign up and create an API key
3. Add credits to your account (some models are free)

### Gemini

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env.local`

## Provider Priority

The system automatically selects providers in this order:

1. **OpenRouter** (if `OPENROUTER_API_KEY` is set)
2. **Gemini** (if `GEMINI_API_KEY` is set)
3. **Error** (if no keys are configured)

## Available Models

### OpenRouter Models (configurable in `src/lib/api/ai-utils.ts`)

- `deepseek/deepseek-r1` (currently selected for testing)
- `minimax/minimax-m1:extended` (original choice)
- `qwen/qwen-2.5-72b-instruct`
- `anthropic/claude-3.5-sonnet`

### Gemini Models

- `gemini-2.0-flash` (default)

## Troubleshooting

### Logging Control

You can enable/disable detailed logging with the `NEXT_PUBLIC_LOGS` environment variable:

```bash
# Enable logging (development)
NEXT_PUBLIC_LOGS=true

# Disable logging (production)
NEXT_PUBLIC_LOGS=false
# or simply omit the variable
```

### Detailed Logging

When logging is enabled (`NEXT_PUBLIC_LOGS=true`), check your console/terminal for:

```
[AI Provider] Checking available API keys: { hasOpenRouterKey: true, ... }
[AI Provider] Selected OpenRouter with config: { provider: 'openrouter', ... }
[AI Analysis] Starting venture agent analysis...
[OpenRouter] Starting analysis with config: { model: 'deepseek/deepseek-r1', ... }
[OpenRouter] Request body prepared: { model: '...', messageCount: 1, ... }
[OpenRouter] Headers prepared: { Authorization: 'Bearer sk-or-v1...', ... }
[OpenRouter] Making API request...
[OpenRouter] Response received: { status: 200, statusText: 'OK', ... }
```

### Common Issues

1. **"Internal Server Error" from OpenRouter**
   - Check if the model is available: some models may be temporarily unavailable
   - Try switching to a different model in `ai-utils.ts`
   - Verify your API key has sufficient credits

2. **"No AI service configured"**
   - Make sure your `.env.local` file exists
   - Restart your development server after adding environment variables

3. **Invalid API Key**
   - Check that your API key is correct and active
   - For OpenRouter, ensure you have credits in your account

### Switching Models

To test different models, edit `src/lib/api/ai-utils.ts`:

```typescript
// Change this line:
const model = AI_MODELS.DEEPSEEK_R1;

// To one of these:
const model = AI_MODELS.MINIMAX_M1_EXTENDED;
const model = AI_MODELS.QWEN_32B;
const model = AI_MODELS.CLAUDE_SONNET;
```

## Testing

1. Start the development server: `npm run dev`
2. Open the application and try to analyze startups
3. Check the console for detailed logging
4. If you see errors, check the troubleshooting section above

## New Features

### Strengthening JSON Responses

#### Problem

Some AI models return responses in the wrong format, leading to JSON parsing errors.

#### Solution

A system for strengthening prompts for problematic models has been implemented:

##### Automatic Detection of Problematic Models

The system automatically applies additional restrictions to the following models:

- `grok-3`
- `minimax-01`
- `phi-4-reasoning-plus`
- `qwen3-30b-a3b`
- `mai-ds-r1`
- `deepseek-r1-0528`

##### Strengthening Prompts

Additional rules are added for problematic models:

- Strict instructions to return ONLY JSON
- Prohibition of markdown formatting
- Examples of correct and incorrect formatting
- Step-by-step verification before sending the response

##### Enhanced Response Processing

- Aggressive cleaning of responses from excess text
- Multiple attempts to parse JSON
- Detailed logging of errors
- Extraction of JSON from markdown blocks

## Logging

Enable detailed logging for debugging:

```bash
export NEXT_PUBLIC_LOGS=true
```

This allows you to see:

- Requests to AI API
- Responses from models
- JSON parsing errors
- Application of strengthened prompts

## Configuration of Timeouts

- AI request timeout: 120 seconds (2 minutes)
- Maximum prompt length: 50,000 characters
- Maximum retry attempts: 3 with exponential delay

## Recommendations for Use

1. **For reliability**: use Gemini 2.0 Flash or Claude Sonnet 4
2. **For economy**: use free models (Mistral Small, DeepSeek R1, Phi-4)
3. **For quality**: use paid models (Grok-3, o4-mini-high)

## Debugging Errors

When encountering JSON errors:

1. Enable logging (`NEXT_PUBLIC_LOGS=true`)
2. Check logs in browser console/server
3. Ensure the model does not return additional text
4. If necessary, add the model to the list of problematic models in `enforceStrictJSONForModel`

## Performance Monitoring

The system automatically logs:

- Time taken for requests
- Number of attempts
- Used model
- Prompt and response lengths
