import { neverminedClient } from './client';
import { neverminedAuth } from './auth';
import { neverminedAssets } from './assets';
import { neverminedPayments } from './payments';

export { NeverminedClient, neverminedClient } from './client';
export { NeverminedAuth, neverminedAuth } from './auth';
export { NeverminedAssets, neverminedAssets } from './assets';
export { NeverminedPayments, neverminedPayments } from './payments';

export type { AssetMetadata, AssetPricing } from './assets';
export type { PaymentTransaction, PaymentPlan } from './payments';

export const Nevermined = {
  client: neverminedClient,
  auth: neverminedAuth,
  assets: neverminedAssets,
  payments: neverminedPayments
};