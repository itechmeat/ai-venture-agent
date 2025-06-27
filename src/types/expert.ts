/**
 * Types for investment experts
 */

export interface InvestmentExpert {
  name: string;
  slug: string;
  fund: string;
  methodology: string;
  expertise: string;
  focus: string;
  price: number;
  photo?: string;
  website?: string;
  twitter?: string;
  isRagExpert?: boolean;
  ragConfig?: {
    topK: number;
    scoreThreshold: number;
    maxContextLength: number;
  };
}
