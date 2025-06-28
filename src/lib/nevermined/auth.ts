import { Account } from '@nevermined-io/nevermined-sdk-js';
import { NeverminedAny } from './types';
import { neverminedClient } from './client';

export class NeverminedAuth {
  private account: Account | null = null;

  async loginWithSeed(seed: string): Promise<Account> {
    try {
      const nevermined = await neverminedClient.getInstance();
      this.account = await (nevermined.accounts as NeverminedAny).load(seed);
      return this.account!;
    } catch {
      throw new Error('Authentication failed');
    }
  }

  async loginWithPrivateKey(privateKey: string): Promise<Account> {
    try {
      const nevermined = await neverminedClient.getInstance();
      this.account = await (nevermined.accounts as NeverminedAny).load(privateKey);
      return this.account!;
    } catch {
      throw new Error('Authentication failed');
    }
  }

  async createAccount(): Promise<Account> {
    try {
      const nevermined = await neverminedClient.getInstance();
      this.account = await (nevermined.accounts as NeverminedAny).create();
      return this.account!;
    } catch {
      throw new Error('Account creation failed');
    }
  }

  getAccount(): Account | null {
    return this.account;
  }

  async getAccountAddress(): Promise<string> {
    if (!this.account) {
      throw new Error('No account loaded. Please login first.');
    }
    return this.account.getId();
  }

  async getAccountBalance(): Promise<string> {
    if (!this.account) {
      throw new Error('No account loaded. Please login first.');
    }
    return await neverminedClient.getBalance(this.account.getId());
  }

  async signMessage(message: string): Promise<string> {
    if (!this.account) {
      throw new Error('No account loaded. Please login first.');
    }
    
    try {
      const nevermined = await neverminedClient.getInstance();
      return await (nevermined.utils as NeverminedAny).signature.signText(message, this.account.getId());
    } catch {
      throw new Error('Message signing failed');
    }
  }

  logout(): void {
    this.account = null;
  }

  isLoggedIn(): boolean {
    return this.account !== null;
  }
}

export const neverminedAuth = new NeverminedAuth();