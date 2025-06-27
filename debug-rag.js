const fetch = require('node-fetch');
require('dotenv').config();

async function debugRagSearch() {
  console.log('🔍 Debugging RAG Search Issue...');

  const qdrantUrl = process.env.QDRANT_CLOUDE_URL;
  const qdrantApiKey = process.env.QDRANT_CLOUDE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  try {
    // 1. Check collection info
    console.log('1. Getting collection info...');
    const collectionResponse = await fetch(`${qdrantUrl}/collections/ben-horowitz`, {
      headers: { 'api-key': qdrantApiKey },
    });

    if (!collectionResponse.ok) {
      throw new Error(`Collection info failed: ${collectionResponse.status}`);
    }

    const collectionData = await collectionResponse.json();
    console.log('✅ Collection info:', {
      status: collectionData.result.status,
      vectorsCount: collectionData.result.vectors_count,
      pointsCount: collectionData.result.points_count,
      indexedVectorsCount: collectionData.result.indexed_vectors_count,
    });

    // 2. Try different search queries
    const testQueries = [
      'venture capital startup investment',
      'team leadership',
      'business strategy',
      'startup',
    ];

    for (const query of testQueries) {
      console.log(`\n2. Testing query: "${query}"`);

      // Generate embedding
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: query,
          dimensions: 1536,
        }),
      });

      if (!embeddingResponse.ok) {
        console.log(`❌ Embedding failed for "${query}"`);
        continue;
      }

      const embeddingData = await embeddingResponse.json();
      const queryVector = embeddingData.data[0].embedding;

      // Try different search parameters
      const searchParams = [
        { limit: 10, score_threshold: 0.3 },
        { limit: 10, score_threshold: 0.1 },
        { limit: 10 }, // No threshold
      ];

      for (const params of searchParams) {
        const searchResponse = await fetch(`${qdrantUrl}/collections/ben-horowitz/points/search`, {
          method: 'POST',
          headers: {
            'api-key': qdrantApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vector: queryVector,
            with_payload: true,
            with_vector: false,
            ...params,
          }),
        });

        if (!searchResponse.ok) {
          console.log(`❌ Search failed with params:`, params);
          continue;
        }

        const searchData = await searchResponse.json();
        const results = searchData.result;

        console.log(`  📊 Results with params ${JSON.stringify(params)}:`, {
          count: results.length,
          topScore: results.length > 0 ? results[0].score : 'N/A',
          bottomScore: results.length > 0 ? results[results.length - 1].score : 'N/A',
        });

        if (results.length > 0) {
          console.log(`  📝 Sample result:`, {
            id: results[0].id,
            score: results[0].score,
            payloadKeys: Object.keys(results[0].payload || {}),
          });

          // Show content preview
          const payload = results[0].payload;
          const contentFields = ['text', 'content', 'chunk', 'page_content'];
          for (const field of contentFields) {
            if (payload[field] && typeof payload[field] === 'string') {
              console.log(
                `  💬 Content preview (${field}):`,
                payload[field].substring(0, 100) + '...',
              );
              break;
            }
          }
        }

        if (results.length > 0) break; // Found results, no need to try other params
      }
    }

    // 3. Try a direct point retrieval
    console.log('\n3. Testing direct point retrieval...');
    const scrollResponse = await fetch(`${qdrantUrl}/collections/ben-horowitz/points/scroll`, {
      method: 'POST',
      headers: {
        'api-key': qdrantApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit: 3,
        with_payload: true,
        with_vector: false,
      }),
    });

    if (scrollResponse.ok) {
      const scrollData = await scrollResponse.json();
      console.log('✅ Sample points from collection:', {
        count: scrollData.result.points.length,
        samplePayloadKeys:
          scrollData.result.points.length > 0
            ? Object.keys(scrollData.result.points[0].payload || {})
            : [],
      });
    }
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugRagSearch();
