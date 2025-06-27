import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({
  url: 'https://14cafe44-097d-4d2a-8903-d5694e620e1c.us-west-2-0.aws.cloud.qdrant.io:6333',
  apiKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.WPb7Zw1wc1We23PGk_sfbevxAYO-9KQIS6vdaI8k4vc',
});

try {
  const result = await client.getCollections();
  console.log('List of collections:', result.collections);
} catch (err) {
  console.error('Could not get collections:', err);
}
