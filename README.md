# Venture Agent

**AI-powered venture capital analysis platform** that provides multi-expert investment analysis for startups using both traditional AI models and RAG (Retrieval-Augmented Generation) with vector database.

## Features

- 🔍 **Automated Startup Analysis** - Fetches and analyzes startup data from various sources
- 👥 **Multi-Expert Analysis** - Multiple AI experts with different investment strategies and perspectives
- 🧠 **RAG Integration** - Advanced analysis using vector database (Qdrant) with contextual knowledge
- 🤖 **Multiple AI Models** - Support for GPT-4, Claude, Gemini and other models via OpenRouter
- 📊 **Investment Strategies** - Comprehensive analysis including bootstrapping, angel, VC, and growth strategies
- ⚡ **Real-time Processing** - Asynchronous analysis with live status updates
- 🔄 **Retry Functionality** - Smart retry system for failed analyses
- 💰 **Nevermined Integration** - AI service monetization with blockchain-based payments and subscriptions

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, SCSS
- **AI Models**: OpenAI GPT-4, Claude, Gemini via OpenRouter
- **Vector DB**: Qdrant Cloud for RAG functionality
- **Monetization**: Nevermined.app integration for AI service payments
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

1. **API Keys**: You'll need API keys for:
   - OpenAI (for embeddings and GPT models)
   - OpenRouter (for accessing multiple AI models)
   - Qdrant Cloud (for vector database)
   - Nevermined.app (for AI service monetization)

### Environment Setup

Create a `.env.local` file in the project root with the following variables:

#### Nevermined Environment Variables

- **`NEVERMINED_AGENT_DID`** - Unique identifier for your AI agent in Nevermined network (e.g., `did:nv:venture-capital-agent-v1`)
- **`NEVERMINED_AGENT_NAME`** - Display name for your AI service (e.g., `Venture Capital Analysis Agent`)
- **`NEVERMINED_AGENT_DESCRIPTION`** - Description of your AI service capabilities
- **`NEVERMINED_API_KEY`** - Your Nevermined API key for authentication
- **`NEVERMINED_JWT_TOKEN`** - JWT token for Nevermined service access
- **`NEVERMINED_TOKEN_ADDRESS`** - Blockchain token contract address for payments
- **`NEVERMINED_SERVICE_ENDPOINT`** - Public URL endpoint for your AI service

```sh
# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3100
NEXT_PUBLIC_LOGS=true
NEXT_PUBLIC_SHOW_MODELS=true
DEEPVEST_PROJECTS_LIMIT=3

# AI Model API Keys
GEMINI_API_KEY=_YOUR_KEY_
OPENROUTER_API_KEY=_YOUR_KEY_
OPENAI_API_KEY=_YOUR_KEY_
NEXT_PUBLIC_DEFAULT_AI_MODEL=google/gemini-2.5-flash

# Vector Database (Qdrant)
QDRANT_CLOUDE_URL=_YOUR_URL_
QDRANT_CLOUDE_API_KEY=_YOUR_KEY_

# Webhooks
WEBHOOK_PROD_URL=_YOUR_URL_

# Nevermined Integration (for AI service monetization)
NEVERMINED_AGENT_DID=did:nv:venture-capital-agent-v1
NEVERMINED_AGENT_NAME=Venture Capital Analysis Agent
NEVERMINED_AGENT_DESCRIPTION=AI-powered venture capital investment analysis and decision making agent
NEVERMINED_API_KEY=_YOUR_KEY_
NEVERMINED_JWT_TOKEN=_YOUR_TOKEN_
NEVERMINED_TOKEN_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
NEVERMINED_SERVICE_ENDPOINT=https://your-venture-agent.com/api
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

Open [http://localhost:3100](http://localhost:3100) to see the application.

## Usage

1. **Configure Default Model** (optional) - Set `NEXT_PUBLIC_DEFAULT_AI_MODEL` in `.env` to choose default AI model
2. **Select AI Model** - Choose from available AI models in the UI (defaults to configured model or Gemini 2.5 Flash)
3. **Choose Experts** - Select investment experts for analysis
4. **Analyze Startups** - Click "Analyze Startups" to begin multi-expert analysis
5. **View Results** - Browse expert analyses with investment recommendations
6. **Retry Failed** - Use retry functionality (🔄) for failed RAG expert analyses

## Expert Analysis

The platform includes various investment experts:

- **Traditional Experts**: Junior Manager, Senior Partners with different investment approaches
- **RAG Experts**: Enhanced experts using vector database for contextual analysis (e.g., Ben Horowitz)

Each expert provides:

- Investment decision (INVEST/PASS)
- Detailed reasoning and analysis
- Risk assessment
- Strategic recommendations

## API Endpoints

- `POST /api/startups` - Fetch startup data
- `POST /api/startups/[id]/full` - Get detailed startup information
- `POST /api/make-decision` - Traditional AI expert analysis
- `POST /api/analyze-rag` - RAG-powered expert analysis

## Development

```bash
# Development with hot reload
npm run dev

# Type checking (built into build)
npm run build

# Linting
npm run lint
```

## Deployment

The application is optimized for deployment on Vercel:

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## License

Private project - All rights reserved.
