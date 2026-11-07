import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  formatted?: string;
  country?: string;
  error?: string;
} {
  try {
    if (!phone || phone.trim() === '') {
      return {
        isValid: false,
        error: 'Le numéro de téléphone est requis',
      };
    }

    // Check if the phone number is valid
    const valid = isValidPhoneNumber(phone);
    
    if (!valid) {
      return {
        isValid: false,
        error: 'Le numéro de téléphone n\'est pas valide',
      };
    }

    // Parse the phone number to get details
    const phoneNumber = parsePhoneNumber(phone);
    
    if (!phoneNumber) {
      return {
        isValid: false,
        error: 'Impossible d\'analyser le numéro de téléphone',
      };
    }

    return {
      isValid: true,
      formatted: phoneNumber.format('E.164'), // International format with +
      country: phoneNumber.country,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Format de numéro invalide',
    };
  }
}

export function formatPhoneE164(phone: string): string {
  try {
    const phoneNumber = parsePhoneNumber(phone);
    return phoneNumber ? phoneNumber.format('E.164') : phone;
  } catch {
    return phone;
  }
}
