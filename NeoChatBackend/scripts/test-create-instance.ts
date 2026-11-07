import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const WEBHOOK_URL = process.env.BACKEND_WEBHOOK_URL || 'http://localhost:3001/api/webhook/evolution';

async function testCreateInstance() {
  const instanceName = 'Test_Debug_' + Date.now();
  const phoneNumber = process.env.TEST_PHONE || '22500000000';

  try {
    console.log('[Test] Création d\'une instance de test...');
    console.log('[Test] Instance:', instanceName);
    console.log('[Test] Numéro:', phoneNumber);
    console.log('[Test] Webhook:', WEBHOOK_URL);

    const requestBody = {
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      webhook: WEBHOOK_URL,
      webhook_by_events: false,
      webhook_base64: false,
      events: [
        'QRCODE_UPDATED',
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE'
      ],
      qrcode: false,
      number: phoneNumber,
    };

    console.log('[Test] Body:', JSON.stringify(requestBody, null, 2));

    const response = await axios.post(
      `${EVOLUTION_API_URL}/instance/create`,
      requestBody,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[Test] ✅ Succès !');
    console.log('[Test] Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('[Test] ❌ Erreur:', error.message);
    if (error.response) {
      console.error('[Test] Statut HTTP:', error.response.status);
      console.error('[Test] Détails:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCreateInstance();
