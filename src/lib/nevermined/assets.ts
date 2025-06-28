import { DDO, MetaData, AssetAttributes } from '@nevermined-io/nevermined-sdk-js';
import { NeverminedAny } from './types';
import { neverminedAuth } from './auth';
import { neverminedClient } from './client';

export interface AssetMetadata {
  name: string;
  description: string;
  author: string;
  license: string;
  dateCreated: string;
  datePublished?: string;
  contentType: string;
  workExample?: string;
  inLanguage?: string;
  tags?: string[];
  categories?: string[];
}

export interface AssetPricing {
  price: string;
  tokenAddress: string;
  duration?: number;
  paymentType: 'one-time' | 'subscription';
}

export class NeverminedAssets {
  async publishDataset(
    metadata: AssetMetadata,
    pricing: AssetPricing,
    fileUrls: string[]
  ): Promise<DDO> {
    const account = neverminedAuth.getAccount();
    if (!account) {
      throw new Error('No account available. Please login first.');
    }

    try {
      const nevermined = await neverminedClient.getInstance();
      
      const assetMetadata: MetaData = {
        main: {
          name: metadata.name,
          author: metadata.author,
          license: metadata.license,
          dateCreated: metadata.dateCreated,
          datePublished: metadata.datePublished || new Date().toISOString(),
          type: 'dataset',
          files: fileUrls.map(url => ({
            url,
            contentType: metadata.contentType,
            name: metadata.name
          }))
        },
        additionalInformation: {
          description: metadata.description,
          workExample: metadata.workExample,
          inLanguage: metadata.inLanguage || 'en',
          tags: metadata.tags || [],
          categories: metadata.categories || []
        }
      };

      const attributes: AssetAttributes = {
        metadata: assetMetadata
      };

      return await nevermined.assets.create(attributes as NeverminedAny, account as NeverminedAny);
    } catch {
      throw new Error('Dataset publication failed');
    }
  }

  async publishAIService(
    metadata: AssetMetadata,
    pricing: AssetPricing,
    serviceEndpoint: string,
    openApiSpec?: object
  ): Promise<DDO> {
    const account = neverminedAuth.getAccount();
    if (!account) {
      throw new Error('No account available. Please login first.');
    }

    try {
      const nevermined = await neverminedClient.getInstance();
      
      const assetMetadata: MetaData = {
        main: {
          name: metadata.name,
          author: metadata.author,
          license: metadata.license,
          dateCreated: metadata.dateCreated,
          datePublished: metadata.datePublished || new Date().toISOString(),
          type: 'algorithm',
          files: [{
            url: serviceEndpoint,
            contentType: 'application/json',
            name: metadata.name
          }]
        },
        additionalInformation: {
          description: metadata.description,
          workExample: metadata.workExample,
          inLanguage: metadata.inLanguage || 'en',
          tags: metadata.tags || [],
          categories: metadata.categories || [],
          ...openApiSpec && { openApiSpec }
        }
      };

      const attributes: AssetAttributes = {
        metadata: assetMetadata
      };

      return await nevermined.assets.create(attributes as NeverminedAny, account as NeverminedAny);
    } catch {
      throw new Error('AI service publication failed');
    }
  }

  async searchAssets(
    query: string,
    filters?: {
      type?: 'dataset' | 'service';
      author?: string;
      tags?: string[];
      priceRange?: { min: string; max: string };
    }
  ) {
    try {
      const nevermined = await neverminedClient.getInstance();
      
      const searchQuery = {
        query: {
          text: query
        },
        sort: {
          created: 'desc'
        },
        ...filters && {
          filters: {
            ...filters.type && { 'metadata.main.type': filters.type },
            ...filters.author && { 'metadata.main.author': filters.author },
            ...filters.tags && { 'metadata.additionalInformation.tags': { $in: filters.tags } }
          }
        }
      };

      return await (nevermined.assets as NeverminedAny).search(searchQuery);
    } catch {
      throw new Error('Asset search failed');
    }
  }

  async getAsset(did: string): Promise<DDO> {
    try {
      const nevermined = await neverminedClient.getInstance();
      return await (nevermined.assets as NeverminedAny).resolve(did);
    } catch {
      throw new Error('Asset retrieval failed');
    }
  }

  async purchaseAsset(did: string, serviceIndex = 0): Promise<string> {
    const account = neverminedAuth.getAccount();
    if (!account) {
      throw new Error('No account available. Please login first.');
    }

    try {
      const nevermined = await neverminedClient.getInstance();
      const agreementId = await (nevermined.assets as NeverminedAny).order(did, serviceIndex, account as NeverminedAny);
      return agreementId;
    } catch {
      throw new Error('Asset purchase failed');
    }
  }

  async downloadAsset(
    agreementId: string,
    did: string,
    serviceIndex = 0,
    destination?: string
  ) {
    const account = neverminedAuth.getAccount();
    if (!account) {
      throw new Error('No account available. Please login first.');
    }

    try {
      const nevermined = await neverminedClient.getInstance();
      return await (nevermined.assets as NeverminedAny).consume(agreementId, did, serviceIndex, account as NeverminedAny, destination);
    } catch {
      throw new Error('Asset download failed');
    }
  }

  async getMyAssets(): Promise<DDO[]> {
    const account = neverminedAuth.getAccount();
    if (!account) {
      throw new Error('No account available. Please login first.');
    }

    try {
      const nevermined = await neverminedClient.getInstance();
      const accountAddress = account.getId();
      
      const searchQuery = {
        query: {
          match_all: {}
        },
        filters: {
          'metadata.main.author': accountAddress
        },
        sort: {
          created: 'desc'
        }
      };

      const result = await (nevermined.assets as NeverminedAny).search(searchQuery);
      return result.results || [];
    } catch {
      throw new Error('Failed to retrieve user assets');
    }
  }
}

export const neverminedAssets = new NeverminedAssets();