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

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, SCSS
- **AI Models**: OpenAI GPT-4, Claude, Gemini via OpenRouter
- **Vector DB**: Qdrant Cloud for RAG functionality
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

1. **API Keys**: You'll need API keys for:
   - OpenAI (for embeddings and GPT models)
   - OpenRouter (for accessing multiple AI models)
   - Qdrant Cloud (for vector database)

### Environment Setup

Create a `.env.local` file in the project root with the following variables:

```sh
NEXT_PUBLIC_APP_URL=http://localhost:3100
NEXT_PUBLIC_LOGS=true
NEXT_PUBLIC_SHOW_MODELS=true
GEMINI_API_KEY=_YOUR_KEY_
OPENROUTER_API_KEY=_YOUR_KEY_
QDRANT_CLOUDE_URL=_YOUR_URL_
QDRANT_CLOUDE_API_KEY=_YOUR_KEY_
OPENAI_API_KEY=_YOUR_KEY_
WEBHOOK_PROD_URL=_YOUR_URL_
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

1. **Select AI Model** - Choose from available AI models (Gemini 2.5 Flash is default)
2. **Choose Experts** - Select investment experts for analysis
3. **Analyze Startups** - Click "Analyze Startups" to begin multi-expert analysis
4. **View Results** - Browse expert analyses with investment recommendations
5. **Retry Failed** - Use retry functionality (🔄) for failed RAG expert analyses

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