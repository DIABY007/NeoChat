'use server';

import { headers } from 'next/headers';

// Récupère dynamiquement le host pour construire l'URL complète.
// Sur Vercel : le host est le domaine du déploiement
// Sur le serveur local : le host est neochat.pro ou localhost
// Dans les deux cas, /api/backend/* → rewrite Next.js → backend Express
async function getApiUrl(): Promise<string> {
  const host = (await headers()).get('host') || 'neochat.pro';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${host}/api/backend/admin/auth`;
}

export interface RequestOTPResponse {
  success: boolean;
  message: string;
  data?: {
    phone: string;
    expiresIn: string;
    devMode?: boolean;
    otpCode?: string;
  };
  error?: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    admin: {
      id: string;
      phoneNumber: string;
      role: 'SUPER_ADMIN' | 'COORDINATEUR';
      name: string | null;
    };
  };
  error?: string;
}

export async function requestAdminOTP(phone: string): Promise<RequestOTPResponse> {
  // Validation côté serveur
  if (!phone || phone.trim().length < 8) {
    return {
      success: false,
      message: 'Numéro de téléphone invalide',
      error: 'Veuillez entrer un numéro de téléphone valide',
    };
  }

  try {
    const apiUrl = await getApiUrl();
      const response = await fetch(`${apiUrl}/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim() }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[AdminAction] Erreur réseau:', error);
    return {
      success: false,
      message: 'Impossible de contacter le serveur',
      error: 'Erreur de connexion. Veuillez réessayer.',
    };
  }
}

export async function verifyAdminOTP(
  phone: string,
  otpCode: string
): Promise<VerifyOTPResponse> {
  if (!phone || !otpCode || otpCode.length !== 4) {
    return {
      success: false,
      message: 'Code OTP invalide',
      error: 'Le code doit contenir exactement 4 chiffres',
    };
  }

  try {
    const apiUrl = await getApiUrl();
      const response = await fetch(`${apiUrl}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim(), otpCode: otpCode.trim() }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[AdminAction] Erreur réseau:', error);
    return {
      success: false,
      message: 'Impossible de contacter le serveur',
      error: 'Erreur de connexion. Veuillez réessayer.',
    };
  }
}