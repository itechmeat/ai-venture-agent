const fetch = require('node-fetch');
require('dotenv').config();

async function testFullRagFlow() {
  console.log('🚀 Testing Full RAG Flow...');
  
  const testStartupData = {
    name: 'TestStartup',
    description: 'An innovative AI-powered platform for venture capital analysis',
    industry: 'FinTech',
    stage: 'Series A',
    team: [
      { name: 'John Doe', role: 'CEO', experience: '10 years in fintech' }
    ]
  };
  
  try {
    // Call the API endpoint
    const response = await fetch('http://localhost:3100/api/make-decision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectData: testStartupData,
        selectedModel: 'mistralai/mistral-small-3.2-24b-instruct:free', // Use free model
        selectedExperts: ['ben-horowitz-ai']
      }),
    });
    
    console.log('📡 API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ RAG Analysis Success!');
    console.log('📊 Metadata:', data.metadata);
    console.log('👨‍💼 Expert:', data.analysis.expert_analyses[0].expert_name);
    console.log('📝 Analysis Keys:', Object.keys(data.analysis.expert_analyses[0].analysis.unified_analysis));
    console.log('💡 Strategies:', Object.keys(data.analysis.expert_analyses[0].analysis.strategies));
    console.log('🎯 Best Strategy:', data.analysis.expert_analyses[0].analysis.recommendation.best_strategy);
    
    // Check for RAG-specific data
    if (data.analysis.expert_analyses[0].analysis.rag_context) {
      console.log('🔍 RAG Context Found:', data.analysis.expert_analyses[0].analysis.rag_context.length, 'chunks');
      console.log('📈 RAG Metadata:', data.analysis.expert_analyses[0].analysis.rag_metadata);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFullRagFlow();