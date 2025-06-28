import { NextRequest, NextResponse } from 'next/server';
import { neverminedAssets } from '@/lib/nevermined';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const query = searchParams.get('query') || '';
  const did = searchParams.get('did');

  try {
    switch (action) {
      case 'search':
        const filters = {
          type: searchParams.get('type') as 'dataset' | 'service' | undefined,
          author: searchParams.get('author') || undefined,
          tags: searchParams.get('tags')?.split(',') || undefined
        };
        
        const searchResults = await neverminedAssets.searchAssets(query, filters);
        return NextResponse.json({
          success: true,
          data: searchResults
        });

      case 'get':
        if (!did) {
          return NextResponse.json(
            { success: false, error: 'DID is required' },
            { status: 400 }
          );
        }
        
        const asset = await neverminedAssets.getAsset(did);
        return NextResponse.json({
          success: true,
          data: asset
        });

      case 'my-assets':
        const myAssets = await neverminedAssets.getMyAssets();
        return NextResponse.json({
          success: true,
          data: myAssets
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Assets operation failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();

    switch (action) {
      case 'publish-dataset':
        const { metadata, pricing, fileUrls } = data;
        const datasetResult = await neverminedAssets.publishDataset(metadata, pricing, fileUrls);
        return NextResponse.json({
          success: true,
          data: datasetResult,
          message: 'Dataset published successfully'
        });

      case 'publish-ai-service':
        const { metadata: serviceMetadata, pricing: servicePricing, serviceEndpoint, openApiSpec } = data;
        const serviceResult = await neverminedAssets.publishAIService(
          serviceMetadata,
          servicePricing,
          serviceEndpoint,
          openApiSpec
        );
        return NextResponse.json({
          success: true,
          data: serviceResult,
          message: 'AI service published successfully'
        });

      case 'purchase':
        const { did, serviceIndex = 0 } = data;
        const agreementId = await neverminedAssets.purchaseAsset(did, serviceIndex);
        return NextResponse.json({
          success: true,
          data: { agreementId },
          message: 'Asset purchased successfully'
        });

      case 'download':
        const { agreementId: downloadAgreementId, did: downloadDid, serviceIndex: downloadServiceIndex = 0, destination } = data;
        const downloadResult = await neverminedAssets.downloadAsset(
          downloadAgreementId,
          downloadDid,
          downloadServiceIndex,
          destination
        );
        return NextResponse.json({
          success: true,
          data: downloadResult,
          message: 'Asset downloaded successfully'
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Assets operation failed' },
      { status: 500 }
    );
  }
}