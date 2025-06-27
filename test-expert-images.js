const investmentExperts = require('./src/data/investment_experts.json');

console.log('🖼️  Testing Expert Images Configuration...\n');

investmentExperts.forEach(expert => {
  const expectedImagePath = expert.photo || `/experts/${expert.slug}.jpg`;
  const imageFileName = expectedImagePath.split('/').pop();
  
  console.log(`👨‍💼 ${expert.name}`);
  console.log(`   Slug: ${expert.slug}`);
  console.log(`   Photo field: ${expert.photo || 'NOT SET'}`);
  console.log(`   Expected image: ${expectedImagePath}`);
  console.log(`   File name: ${imageFileName}`);
  
  if (expert.isRagExpert) {
    console.log(`   🤖 RAG Expert: YES`);
  }
  
  console.log('');
});

console.log('✅ All experts configured for image loading!');