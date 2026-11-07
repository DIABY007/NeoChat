import { Worker, Job } from 'bullmq';
import redisConnection from '../config/redis';
import { StatusJob } from '../queues/statusQueue';
import prisma from '../config/prisma';
import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const processStatusJob = async (job: Job<StatusJob>) => {
  const { scheduledStatusId } = job.data;

  console.log(`[StatusWorker] Traitement du statut ${scheduledStatusId}`);

  const scheduledStatus = await prisma.scheduledStatus.findUnique({
    where: { id: scheduledStatusId },
    include: {
      instance: { select: { instanceName: true, status: true } },
    },
  });

  if (!scheduledStatus) {
    console.error(`[StatusWorker] ❌ Statut ${scheduledStatusId} introuvable en base`);
    return;
  }

  if (scheduledStatus.status !== 'PENDING') {
    console.log(`[StatusWorker] Statut ${scheduledStatusId} déjà traité (${scheduledStatus.status}), ignoré`);
    return;
  }

  const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  const apiKey = process.env.EVOLUTION_API_KEY || '';
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const instanceName = scheduledStatus.instance.instanceName;

  try {
    // Construire le payload (flat, sans wrapper — validé par curl)
    let payload: Record<string, any>;

    if (scheduledStatus.type === 'TEXT') {
      payload = {
        type: 'text',
        content: scheduledStatus.content,
        backgroundColor: scheduledStatus.backgroundColor || '#1b5583',
        font: 1,
        allContacts: true,
      };
    } else {
      // IMAGE ou VIDEO — s'assurer que l'URL est accessible
      let mediaUrl = scheduledStatus.content;
      if (mediaUrl.startsWith('/')) {
        mediaUrl = `${backendUrl}${mediaUrl}`;
      }
      payload = {
        type: scheduledStatus.type.toLowerCase(),
        content: mediaUrl,
        caption: scheduledStatus.caption || '',
        allContacts: true,
      };
    }

    console.log(`[StatusWorker] POST ${evolutionUrl}/message/sendStatus/${instanceName}`);
    console.log(`[StatusWorker] Payload:`, JSON.stringify(payload, null, 2));

    const response = await axios.post(
      `${evolutionUrl}/message/sendStatus/${instanceName}`,
      payload,
      {
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log(`[StatusWorker] ✅ Statut publié avec succès (HTTP ${response.status})`);

    await prisma.scheduledStatus.update({
      where: { id: scheduledStatusId },
      data: { status: 'POSTED' },
    });

    // Nettoyage disque après délai (laisser Evolution API télécharger le fichier)
    if (scheduledStatus.localFilePath) {
      const filePath = scheduledStatus.localFilePath;
      setTimeout(async () => {
        try {
          await fs.promises.unlink(filePath);
          console.log(`[StatusWorker] 🗑️ Fichier supprimé: ${filePath}`);
        } catch (unlinkErr: any) {
          console.warn(`[StatusWorker] ⚠️ Fichier déjà supprimé ou introuvable: ${filePath}`);
        }
      }, 60_000); // 60 secondes de délai
    }
  } catch (error: any) {
    const errMsg = error.response?.data
      ? JSON.stringify(error.response.data)
      : error.message;
    console.error(`[StatusWorker] ❌ Erreur publication statut:`, errMsg);

    await prisma.scheduledStatus.update({
      where: { id: scheduledStatusId },
      data: { status: 'FAILED' },
    });

    throw error; // rethrow pour que BullMQ puisse retry
  }
};

export const statusWorker = new Worker<StatusJob>(
  'StatusQueue',
  processStatusJob,
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

statusWorker.on('completed', (job) => {
  console.log(`[StatusWorker] Job ${job.id} terminé avec succès`);
});

statusWorker.on('failed', (job, err) => {
  console.error(`[StatusWorker] Job ${job?.id} échoué:`, err.message);
});

statusWorker.on('error', (err) => {
  console.error('[StatusWorker] Worker error:', err);
});

console.log('✅ StatusWorker initialized and listening for jobs');

export default statusWorker;
