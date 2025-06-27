/**
 * Simple test script for RAG functionality
 * This script tests the basic RAG services and configuration
 */

const path = require('path');

// Set up environment variables from .env
require('dotenv').config({ 
  path: path.join(__dirname, '.env') 
});

async function testRagConfig() {
  console.log('🔧 Testing RAG Configuration...');
  
  try {
    // Test if we can import the RAG config
    const { RAG_CONFIG, validateRagConfig } = require('./src/config/rag-config.ts');
    console.log('✅ RAG config imported successfully');
    
    // Test configuration validation
    validateRagConfig();
    console.log('✅ RAG configuration validation passed');
    
    console.log('📋 RAG Configuration:');
    console.log('  - Qdrant URL:', RAG_CONFIG.qdrant.url ? '✅ Set' : '❌ Missing');
    console.log('  - Qdrant API Key:', RAG_CONFIG.qdrant.apiKey ? '✅ Set' : '❌ Missing');
    console.log('  - Collection Name:', RAG_CONFIG.qdrant.collectionName);
    console.log('  - Search Top K:', RAG_CONFIG.search.topK);
    console.log('  - Score Threshold:', RAG_CONFIG.search.scoreThreshold);
    
    return true;
  } catch (error) {
    console.error('❌ RAG Configuration test failed:', error.message);
    return false;
  }
}

async function testQdrantConnection() {
  console.log('\n🌐 Testing Qdrant Connection...');
  
  try {
    const { qdrantService } = require('./src/lib/rag/qdrant-service.ts');
    
    // Test collection health
    console.log('  Checking collection health...');
    const isHealthy = await qdrantService.checkCollectionHealth();
    console.log('✅ Collection health check:', isHealthy ? 'HEALTHY' : 'UNHEALTHY');
    
    // Get collection info
    console.log('  Getting collection info...');
    const collectionInfo = await qdrantService.getCollectionInfo();
    console.log('✅ Collection Info:');
    console.log('    - Name:', collectionInfo.name);
    console.log('    - Status:', collectionInfo.status);
    console.log('    - Points Count:', collectionInfo.pointsCount);
    console.log('    - Vectors Count:', collectionInfo.vectorsCount);
    
    return true;
  } catch (error) {
    console.error('❌ Qdrant connection test failed:', error.message);
    return false;
  }
}

async function testEmbeddingsService() {
  console.log('\n🧠 Testing Embeddings Service...');
  
  try {
    const { embeddingsService } = require('./src/lib/rag/embeddings-service.ts');
    
    // Test embedding generation
    console.log('  Generating test embedding...');
    const testText = 'This is a test startup looking for venture capital investment';
    const embeddingResult = await embeddingsService.generateEmbedding(testText);
    
    console.log('✅ Embedding generated successfully:');
    console.log('    - Vector length:', embeddingResult.embedding.length);
    console.log('    - Prompt tokens:', embeddingResult.usage.promptTokens);
    console.log('    - Total tokens:', embeddingResult.usage.totalTokens);
    
    return true;
  } catch (error) {
    console.error('❌ Embeddings service test failed:', error.message);
    return false;
  }
}

async function testRagAnalyzer() {
  console.log('\n🔍 Testing RAG Analyzer...');
  
  try {
    const { ragAnalyzer } = require('./src/lib/rag/rag-analyzer.ts');
    
    // Test startup analysis
    console.log('  Performing RAG analysis...');
    const testStartupData = {
      name: 'TestStartup',
      description: 'An innovative AI-powered platform for venture capital analysis',
      industry: 'FinTech',
      stage: 'Series A',
      team: [
        { name: 'John Doe', role: 'CEO', experience: '10 years in fintech' }
      ]
    };
    
    const ragResult = await ragAnalyzer.analyzeStartup(testStartupData);
    
    console.log('✅ RAG analysis completed successfully:');
    console.log('    - Context chunks found:', ragResult.context.length);
    console.log('    - Total tokens:', ragResult.totalTokens);
    console.log('    - Search results:', ragResult.searchResults);
    console.log('    - Processing time:', ragResult.processingTime, 'ms');
    console.log('    - Context relevant:', ragAnalyzer.isContextRelevant(ragResult.context));
    
    if (ragResult.context.length > 0) {
      console.log('    - Sample context preview:', ragResult.context[0].content.substring(0, 100) + '...');
      console.log('    - Sample context score:', ragResult.context[0].score);
    }
    
    return true;
  } catch (error) {
    console.error('❌ RAG analyzer test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting RAG System Tests\n');
  
  const tests = [
    { name: 'RAG Configuration', fn: testRagConfig },
    { name: 'Qdrant Connection', fn: testQdrantConnection },
    { name: 'Embeddings Service', fn: testEmbeddingsService },
    { name: 'RAG Analyzer', fn: testRagAnalyzer },
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      console.error(`❌ Unexpected error in ${test.name}:`, error);
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All RAG tests passed! System is ready for use.');
  } else {
    console.log('⚠️  Some tests failed. Please check the configuration and services.');
  }
  
  return passedTests === totalTests;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };