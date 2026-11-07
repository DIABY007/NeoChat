import axios from 'axios';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const SYSTEM_INSTANCE = process.env.EVOLUTION_SYSTEM_INSTANCE || 'NeoChat_System';

export async function sendOTPViaWhatsApp(phone: string, otpCode: string): Promise<boolean> {
  try {
    const cleanedNumber = phone.replace(/[^0-9]/g, '');
    const message = `🔐 Votre code de vérification NeoChat est : *${otpCode}*\n\nCe code expire dans 5 minutes.\n\n_Ne partagez ce code avec personne._`;

    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${SYSTEM_INSTANCE}`,
      {
        number: cleanedNumber,
        text: message,
      },
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[Evolution] OTP envoyé à ${cleanedNumber} via ${SYSTEM_INSTANCE}`);
    return true;
  } catch (error: any) {
    console.error(`[Evolution] Erreur lors de l'envoi de l'OTP:`, error.message);
    throw new Error('Impossible d\'envoyer le code OTP via WhatsApp');
  }
}
