/**
 * Simple RAG connectivity test
 */

require('dotenv').config();

async function testQdrantConnection() {
  console.log('🔧 Testing Qdrant Connection...');

  const qdrantUrl = process.env.QDRANT_CLOUDE_URL;
  const qdrantApiKey = process.env.QDRANT_CLOUDE_API_KEY;

  if (!qdrantUrl) {
    console.error('❌ QDRANT_CLOUDE_URL not set in environment');
    return false;
  }

  if (!qdrantApiKey) {
    console.error('❌ QDRANT_CLOUDE_API_KEY not set in environment');
    return false;
  }

  console.log('✅ Environment variables are set');
  console.log('  - Qdrant URL:', qdrantUrl);
  console.log('  - API Key:', qdrantApiKey.substring(0, 20) + '...');

  try {
    // Test basic connection to Qdrant
    const response = await fetch(`${qdrantUrl}/collections`, {
      method: 'GET',
      headers: {
        'api-key': qdrantApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully connected to Qdrant');
    console.log('  - Collections found:', data.result.collections.length);

    // Look for ben-horowitz collection
    const horowitzCollection = data.result.collections.find(col => col.name === 'ben-horowitz');

    if (horowitzCollection) {
      console.log('✅ Found "ben-horowitz" collection');
      console.log('  - Status:', horowitzCollection.status || 'unknown');
    } else {
      console.log('❌ "ben-horowitz" collection not found');
      console.log(
        '  - Available collections:',
        data.result.collections.map(c => c.name),
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Qdrant:', error.message);
    return false;
  }
}

async function testOpenAIConnection() {
  console.log('\n🧠 Testing OpenAI Connection...');

  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.error('❌ OPENAI_API_KEY not set in environment');
    return false;
  }

  console.log('✅ OpenAI API key is set');
  console.log('  - API Key:', openaiApiKey.substring(0, 20) + '...');

  try {
    // Test OpenAI API with a simple embedding request
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: 'test embedding',
        dimensions: 1536,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP ${response.status}: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    console.log('✅ Successfully connected to OpenAI');
    console.log('  - Embedding dimension:', data.data[0].embedding.length);
    console.log('  - Tokens used:', data.usage.total_tokens);

    return true;
  } catch (error) {
    console.error('❌ Failed to connect to OpenAI:', error.message);
    return false;
  }
}

async function testRagSearch() {
  console.log('\n🔍 Testing RAG Search...');

  const qdrantUrl = process.env.QDRANT_CLOUDE_URL;
  const qdrantApiKey = process.env.QDRANT_CLOUDE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  try {
    // 1. Generate embedding for search query
    console.log('  Generating embedding for search query...');
    const searchQuery = 'venture capital startup investment team leadership';

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: searchQuery,
        dimensions: 1536,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryVector = embeddingData.data[0].embedding;

    console.log('✅ Query embedding generated');
    console.log('  - Vector dimension:', queryVector.length);

    // 2. Search in Qdrant
    console.log('  Searching in Qdrant collection...');

    const searchResponse = await fetch(`${qdrantUrl}/collections/ben-horowitz/points/search`, {
      method: 'POST',
      headers: {
        'api-key': qdrantApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vector: queryVector,
        limit: 3,
        score_threshold: 0.5,
        with_payload: true,
        with_vector: false,
      }),
    });

    if (!searchResponse.ok) {
      throw new Error(`Search API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const results = searchData.result;

    console.log('✅ RAG search completed successfully');
    console.log('  - Results found:', results.length);

    if (results.length > 0) {
      results.forEach((result, index) => {
        console.log(`  - Result ${index + 1}:`);
        console.log(`    Score: ${result.score.toFixed(4)}`);
        console.log(`    ID: ${result.id}`);

        // Try to show some content preview
        const payload = result.payload;
        const contentFields = ['text', 'content', 'chunk', 'page_content'];
        let content = 'No content field found';

        for (const field of contentFields) {
          if (payload[field] && typeof payload[field] === 'string') {
            content = payload[field].substring(0, 100) + '...';
            break;
          }
        }

        console.log(`    Content: ${content}`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ RAG search test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Simple RAG Tests\n');

  const tests = [
    { name: 'Qdrant Connection', fn: testQdrantConnection },
    { name: 'OpenAI Connection', fn: testOpenAIConnection },
    { name: 'RAG Search', fn: testRagSearch },
  ];

  let passedTests = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      console.error(`💥 Unexpected error in ${test.name}:`, error);
    }
  }

  console.log(`\n📊 Test Results: ${passedTests}/${tests.length} tests passed`);

  if (passedTests === tests.length) {
    console.log('🎉 All tests passed! RAG system is ready.');
  } else {
    console.log('⚠️  Some tests failed. Check configuration.');
  }

  return passedTests === tests.length;
}

// Run the tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
