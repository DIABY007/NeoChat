import axios from 'axios';

const MAKETOU_API_URL = process.env.MAKETOU_API_URL || 'https://api.maketou.net';
const MAKETOU_API_KEY = process.env.MAKETOU_API_KEY || '';

export interface MaketouCheckoutRequest {
  productDocumentId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  redirectURL?: string;
  meta?: {
    userId: string;
    subscriptionId: string;
    plan: string;
    referralCode?: string;
    referredBy?: string;
  };
}

export interface MaketouCheckoutResponse {
  success: boolean;
  cartId: string;
  redirectUrl: string;
  status: string;
}

export async function createMaketouCheckout(request: MaketouCheckoutRequest): Promise<MaketouCheckoutResponse> {
  throw new Error('La passerelle de paiement en ligne est actuellement désactivée.');
}

export async function getMaketouCart(cartId: string): Promise<any> {
  throw new Error('La passerelle de paiement en ligne est actuellement désactivée.');
}
