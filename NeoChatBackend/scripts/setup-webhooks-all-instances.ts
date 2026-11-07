import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const WEBHOOK_URL = process.env.BACKEND_WEBHOOK_URL || 'http://localhost:3001/api/webhook/evolution';

async function setupWebhooksForAllInstances() {
  try {
    console.log('[Script] Récupération de toutes les instances...');
    
    // Récupérer toutes les instances depuis Evolution API
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );

    const instances = response.data;
    console.log(`[Script] ${instances.length} instances trouvées\n`);

    for (const instance of instances) {
      const instanceName = instance.name;
      
      console.log(`[Script] Configuration du webhook pour: ${instanceName}`);
      
      try {
        // Configurer le webhook pour cette instance
        const webhookResponse = await axios.post(
          `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
          {
            enabled: true,
            url: WEBHOOK_URL,
            webhookByEvents: false,
            webhookBase64: false,
            events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE']
          },
          {
            headers: {
              'apikey': EVOLUTION_API_KEY,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(`[Script] ✅ Webhook configuré pour ${instanceName}`);
      } catch (error: any) {
        console.error(`[Script] ❌ Erreur pour ${instanceName}:`, error.response?.data || error.message);
      }
      
      console.log('');
    }

    console.log('[Script] ✅ Configuration terminée !');
  } catch (error: any) {
    console.error('[Script] ❌ Erreur:', error.message);
    if (error.response) {
      console.error('[Script] Détails:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

setupWebhooksForAllInstances();
