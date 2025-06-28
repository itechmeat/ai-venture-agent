import { neverminedClient } from './client';
import { NeverminedAny } from './types';
import { neverminedAuth } from './auth';

export interface PaymentTransaction {
  agreementId: string;
  did: string;
  amount: string;
  tokenAddress: string;
  consumer: string;
  provider: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface PaymentPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  tokenAddress: string;
  duration: number;
  features: string[];
  maxCredits?: number;
}

export class NeverminedPayments {
  async createPaymentPlan(
    name: string,
    description: string,
    price: string,
    tokenAddress: string,
    duration: number,
    features: string[],
    maxCredits?: number
  ): Promise<PaymentPlan> {
    const account = neverminedAuth.getAccount();
    if (!account) {
      throw new Error('No account available. Please login first.');
    }

    try {
      const nevermined = await neverminedClient.getInstance();
      
      const planData = {
        name,
        description,
        price,
        tokenAddress,
        duration,
        features,
        maxCredits
      };

      const plan = await (nevermined as NeverminedAny).subscriptions.createPlan(planData, account);
      return plan;
    } catch {
      throw new Error('Payment plan creation failed');
    }
  }

  async subscribeToService(
    serviceId: string,
    planId: string,
    duration: number
  ): Promise<string> {
    const account = neverminedAuth.getAccount();
    if (!account) {
      throw new Error('No account available. Please login first.');
    }

    try {
      const nevermined = await neverminedClient.getInstance();
      
      const agreementId = await (nevermined as NeverminedAny).agreements.create(
        serviceId,
        account.getId(),
        account.getId(),
        {
          type: 'subscription',
          duration,
          planId
        }
      );

      return agreementId;
    } catch {
      throw new Error('Service subscription failed');
    }
  }

  async processPayment(
    amount: string,
    tokenAddress: string,
    recipient: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _agreementId?: string
  ): Promise<string> {
    const account = neverminedAuth.getAccount();
    if (!account) {
      throw new Error('No account available. Please login first.');
    }

    try {
      const nevermined = await neverminedClient.getInstance();
      
      const txHash = await (nevermined as NeverminedAny).tokens.transfer(
        tokenAddress,
        recipient,
        amount,
        account
      );

      return txHash;
    } catch {
      throw new Error('Payment processing failed');
    }
  }

  async getPaymentHistory(): Promise<PaymentTransaction[]> {
    const account = neverminedAuth.getAccount();
    if (!account) {
      throw new Error('No account available. Please login first.');
    }

    try {
      const nevermined = await neverminedClient.getInstance();
      const accountAddress = account.getId();
      
      const agreements = await (nevermined as NeverminedAny).agreements.getAgreements(accountAddress);
      
      const transactions: PaymentTransaction[] = agreements.map((agreement: Record<string, unknown>) => ({
        agreementId: agreement.agreementId,
        did: agreement.did,
        amount: agreement.price,
        tokenAddress: agreement.tokenAddress,
        consumer: agreement.consumer,
        provider: agreement.provider,
        timestamp: agreement.timestamp,
        status: agreement.status
      }));

      return transactions;
    } catch {
      throw new Error('Failed to retrieve payment history');
    }
  }

  async getEarnings(): Promise<{
    total: string;
    monthly: string;
    transactions: PaymentTransaction[];
  }> {
    const account = neverminedAuth.getAccount();
    if (!account) {
      throw new Error('No account available. Please login first.');
    }

    try {
      const transactions = await this.getPaymentHistory();
      const accountAddress = account.getId();
      
      const earnings = transactions.filter(tx => tx.provider === accountAddress);
      
      const total = earnings.reduce((sum, tx) => {
        return sum + parseFloat(tx.amount);
      }, 0);

      const currentMonth = new Date().getMonth();
      const monthlyEarnings = earnings.filter(tx => {
        return new Date(tx.timestamp).getMonth() === currentMonth;
      });

      const monthly = monthlyEarnings.reduce((sum, tx) => {
        return sum + parseFloat(tx.amount);
      }, 0);

      return {
        total: total.toString(),
        monthly: monthly.toString(),
        transactions: earnings
      };
    } catch {
      throw new Error('Failed to retrieve earnings');
    }
  }

  async requestPayout(amount: string, address: string): Promise<string> {
    const account = neverminedAuth.getAccount();
    if (!account) {
      throw new Error('No account available. Please login first.');
    }

    try {
      const nevermined = await neverminedClient.getInstance();
      const payoutId = await (nevermined as NeverminedAny).payments.requestPayout(amount, address, account);
      
      return payoutId;
    } catch {
      throw new Error('Payout request failed');
    }
  }

  async getTokenBalance(tokenAddress: string): Promise<string> {
    const account = neverminedAuth.getAccount();
    if (!account) {
      throw new Error('No account available. Please login first.');
    }

    try {
      const nevermined = await neverminedClient.getInstance();
      return await (nevermined as NeverminedAny).tokens.balance(tokenAddress, account.getId());
    } catch {
      throw new Error('Failed to retrieve token balance');
    }
  }
}

export const neverminedPayments = new NeverminedPayments();