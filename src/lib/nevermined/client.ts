import { Nevermined, Logger } from '@nevermined-io/nevermined-sdk-js';
import { NeverminedAny } from './types';

export class NeverminedClient {
  private nevermined: Nevermined | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return this.nevermined;

    try {
      (Logger as NeverminedAny).setLevel('info');
      
      this.nevermined = await Nevermined.getInstance({
        web3Provider: process.env.NEVERMINED_NODE_URI || 'https://node.nevermined.app',
        marketplaceUri: process.env.NEVERMINED_METADATA_URI || 'https://metadata.nevermined.app',
        neverminedNodeUri: process.env.NEVERMINED_GATEWAY_URI || 'https://gateway.nevermined.app',
        neverminedNodeAddress: process.env.NEVERMINED_GATEWAY_ADDRESS || '0x068Ed00cF0441e4829D9784fCBe7b9e26D4BD8d0',
        verbose: process.env.NODE_ENV === 'development'
      });

      this.initialized = true;
      return this.nevermined;
    } catch {
      throw new Error('Nevermined initialization failed');
    }
  }

  async getInstance(): Promise<Nevermined> {
    if (!this.nevermined) {
      await this.initialize();
    }
    return this.nevermined!;
  }

  async getBalance(accountAddress: string): Promise<string> {
    const instance = await this.getInstance();
    return await (instance.accounts as NeverminedAny).balance(accountAddress);
  }

  async searchAssets(query: Record<string, unknown>, sort: Record<string, unknown> = {}, offset = 0, page = 1) {
    const instance = await this.getInstance();
    return await (instance.assets as NeverminedAny).search(query, sort, offset, page);
  }

  async createAsset(metadata: Record<string, unknown>, publisher: Record<string, unknown>) {
    const instance = await this.getInstance();
    return await (instance.assets as NeverminedAny).create(metadata, publisher);
  }

  async purchaseAsset(did: string, serviceIndex: number, consumer: Record<string, unknown>) {
    const instance = await this.getInstance();
    return await (instance.assets as NeverminedAny).order(did, serviceIndex, consumer);
  }

  async downloadAsset(agreementId: string, did: string, serviceIndex: number, consumer: Record<string, unknown>, destination?: string) {
    const instance = await this.getInstance();
    return await (instance.assets as NeverminedAny).consume(agreementId, did, serviceIndex, consumer, destination);
  }
}

export const neverminedClient = new NeverminedClient();