import { Worker, Job } from 'bullmq';
import redisConnection from '../config/redis';
import { MessageJob } from '../queues/messageQueue';
import axios from 'axios';
import dotenv from 'dotenv';
import prisma from '../config/prisma';

dotenv.config();

const processMessage = async (job: Job<MessageJob>) => {
  const { instanceName, recipientPhone, message, userId, mediaUrl, mediaType } = job.data;
  
  // Préserver l'ID de groupe si présent, sinon nettoyer le numéro
  const cleanedNumber = recipientPhone.includes('@g.us') 
    ? recipientPhone 
    : recipientPhone.replace(/[^0-9]/g, '');

  console.log(`[Worker] Processing job ${job.id} for instance: ${instanceName}`);
  console.log(`[Worker] Job data:`, { 
    recipientPhone: cleanedNumber, 
    hasMessage: !!message, 
    messageLength: message?.length || 0,
    hasMediaUrl: !!mediaUrl, 
    mediaType,
    mediaUrl: mediaUrl ? `${mediaUrl.substring(0, 50)}...` : 'none'
  });

  try {
    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    const apiKey = process.env.EVOLUTION_API_KEY || '';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    console.log(`[Worker] Using API key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);

    let response;

    if (mediaUrl && mediaType) {
      console.log(`[Worker] Sending ${mediaType} with message to ${cleanedNumber} via ${instanceName}`);
      
      // Convertir le chemin local en URL complète si nécessaire
      let fullMediaUrl = mediaUrl;
      if (mediaUrl.startsWith('/')) {
        fullMediaUrl = `${backendUrl}${mediaUrl}`;
        console.log(`[Worker] Converted local path to URL: ${fullMediaUrl}`);
      }
      
      let endpoint = '';
      let payload: any = {
        number: cleanedNumber,
      };

      if (mediaType === 'image') {
        endpoint = `${evolutionUrl}/message/sendMedia/${instanceName}`;
        payload.mediatype = 'image';
        payload.media = fullMediaUrl;
        if (message) {
          payload.caption = message;
        }
      } else if (mediaType === 'video') {
        endpoint = `${evolutionUrl}/message/sendMedia/${instanceName}`;
        payload.mediatype = 'video';
        payload.media = fullMediaUrl;
        if (message) {
          payload.caption = message;
        }
      } else if (mediaType === 'document') {
        endpoint = `${evolutionUrl}/message/sendMedia/${instanceName}`;
        payload.mediatype = 'document';
        payload.media = fullMediaUrl;
        if (message) {
          payload.caption = message;
        }
      }

      console.log(`[Worker] Sending to endpoint: ${endpoint}`);
      console.log(`[Worker] Payload:`, JSON.stringify(payload, null, 2));

      response = await axios.post(endpoint, payload, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      console.log(`[Worker] Response status: ${response.status}`);
      console.log(`[Worker] Response data:`, JSON.stringify(response.data, null, 2));
    } else {
      console.log(`[Worker] Sending text message to ${cleanedNumber} via ${instanceName}`);
      
      response = await axios.post(
        `${evolutionUrl}/message/sendText/${instanceName}`,
        {
          number: cleanedNumber,
          text: message,
        },
        {
          headers: {
            'apikey': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log(`[Worker] ✅ Message sent successfully to ${cleanedNumber}`);

    // Logger l'activité du message sortant
    try {
      const instance = await prisma.instance.findFirst({
        where: { instanceName },
      });
      if (instance) {
        await prisma.messageActivity.create({
          data: {
            instanceId: instance.id,
            instanceName: instance.instanceName,
            direction: 'OUTGOING',
            senderPhone: cleanedNumber.includes('@g.us') ? cleanedNumber : cleanedNumber,
            messageText: message ? message.substring(0, 500) : '',
            isGroupMessage: cleanedNumber.includes('@g.us'),
            groupId: cleanedNumber.includes('@g.us') ? cleanedNumber : null,
            wasAnswered: true,
          },
        });
      }
    } catch (logError) {
      console.error(`[Worker] ⚠️ Erreur logging message sortant:`, logError);
    }

    return { success: true, response: response.data };

  } catch (error: any) {
    console.error(`[Worker] ❌ Error sending message:`, error.message);
    throw error;
  }
};

export const messageWorker = new Worker<MessageJob>(
  'MessageQueue',
  processMessage,
  {
    connection: redisConnection,
    limiter: {
      max: 1,
      duration: 5000,
    },
    concurrency: 5,
  }
);

messageWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

messageWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
});

messageWorker.on('error', (err) => {
  console.error('[Worker] Worker error:', err);
});

console.log('✅ MessageWorker initialized and listening for jobs');

export default messageWorker;
