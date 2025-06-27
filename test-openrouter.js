const fetch = require('node-fetch');
require('dotenv').config();

async function testOpenRouter() {
  console.log('🧪 Testing OpenRouter API...');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set');
    return;
  }
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3100',
        'X-Title': 'AI Venture Agent Test',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        messages: [
          {
            role: 'user',
            content: 'Say "OpenRouter API is working!" in JSON format like {"message": "your response"}'
          }
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenRouter API error: ${response.status}`, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ OpenRouter API response:', data.choices[0].message.content);
    
    // Test another model
    console.log('\n🧪 Testing free model...');
    const freeResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3100',
        'X-Title': 'AI Venture Agent Test',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-small-3.2-24b-instruct:free',
        messages: [
          {
            role: 'user',
            content: 'Say "Free model is working!" in JSON format like {"message": "your response"}'
          }
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });
    
    if (freeResponse.ok) {
      const freeData = await freeResponse.json();
      console.log('✅ Free model response:', freeData.choices[0].message.content);
    } else {
      console.log('❌ Free model failed:', freeResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOpenRouter();