import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const WEBHOOK_URL = process.env.BACKEND_WEBHOOK_URL || 'http://localhost:3001/api/webhook/evolution';

async function configureWebhook(instanceName: string) {
  try {
    console.log(`[Script] Configuration du webhook pour l'instance: ${instanceName}`);
    console.log(`[Script] Webhook URL: ${WEBHOOK_URL}`);

    const response = await axios.post(
      `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
      {
        webhook: {
          enabled: true,
          url: WEBHOOK_URL,
          webhook_by_events: false,
          webhook_base64: false,
          events: [
            'QRCODE_UPDATED',
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'CONNECTION_UPDATE'
          ]
        }
      },
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[Script] ✅ Webhook configuré avec succès !`);
    console.log(`[Script] Réponse:`, JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error(`[Script] ❌ Erreur:`, error.message);
    if (error.response) {
      console.error(`[Script] Statut HTTP: ${error.response.status}`);
      console.error(`[Script] Détails:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Récupérer le nom de l'instance depuis les arguments
const instanceName = process.argv[2];

if (!instanceName) {
  console.error('❌ Usage: ts-node scripts/configure-webhook.ts <instanceName>');
  console.error('Exemple: ts-node scripts/configure-webhook.ts diaby007_1738012800000');
  process.exit(1);
}

configureWebhook(instanceName);
