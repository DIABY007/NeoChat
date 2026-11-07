import { getPendingCampaigns, updateCampaign } from '../models/Campaign';
import { messageQueue } from '../queues/messageQueue';
import { processSpintax } from '../utils/spintax';
import prisma from '../config/prisma';
import SystemMessagesService from '../services/systemMessagesService';

let isProcessing = false;

// Au démarrage, récupérer les campagnes bloquées en PROCESSING (crash/restart)
async function recoverStuckCampaigns() {
  try {
    const stuck = await prisma.campaign.updateMany({
      where: { status: 'PROCESSING' },
      data: { status: 'PENDING' },
    });
    if (stuck.count > 0) {
      console.log(`[Campaign] ♻️ ${stuck.count} campagne(s) PROCESSING récupérée(s) → PENDING après restart`);
    }
  } catch (err) {
    console.error('[Campaign] Erreur récupération campagnes bloquées:', err);
  }
}
recoverStuckCampaigns();

export async function processCampaigns() {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    const pendingCampaigns = await getPendingCampaigns();

    for (const campaign of pendingCampaigns) {
      console.log(`[Campaign] Traitement de la campagne ${campaign.id}: ${campaign.name}`);

      const user = await prisma.user.findUnique({
        where: { id: campaign.userId },
        include: { subscription: true },
      });

      if (!user || !user.subscription) {
        console.log(`[Campaign] ⚠️ Utilisateur ou abonnement non trouvé pour la campagne ${campaign.id}`);
        await updateCampaign(campaign.id, { status: 'FAILED' });
        continue;
      }

      if (user.subscription.status === 'EXPIRED') {
        console.log(`[Campaign] ⚠️ Abonnement expiré pour la campagne ${campaign.id}`);
        await updateCampaign(campaign.id, { status: 'FAILED' });
        continue;
      }

      await updateCampaign(campaign.id, { status: 'PROCESSING' });

      let successCount = 0;
      const recipients = campaign.recipients as string[];

      for (const recipient of recipients) {
        if (user.subscription.status === 'TRIAL' && user.subscription.messageCount >= 50) {
          console.log(`[Campaign] ⚠️ Limite de 50 messages atteinte pour l'utilisateur ${campaign.userId}`);
          await prisma.subscription.update({
            where: { id: user.subscription.id },
            data: { status: 'EXPIRED' },
          });
          // Envoyer notification quota épuisé
          try {
            if (user.phone) {
              await SystemMessagesService.sendQuotaExhausted(user.phone, 'messages d\'essai (50 messages)');
            }
          } catch (e) {
            console.error(`[Campaign] Erreur notification quota épuisé:`, e);
          }
          await updateCampaign(campaign.id, { status: 'PAUSED', processedCount: successCount });
          break;
        }

        const personalizedMessage = processSpintax(campaign.message);

        console.log(`[Campaign] Ajout message pour ${recipient}:`, {
          hasMedia: !!campaign.mediaUrl,
          mediaType: campaign.mediaType,
          messageLength: personalizedMessage?.length || 0
        });

        await messageQueue.add('send-message', {
          instanceName: campaign.instanceName,
          recipientPhone: recipient,
          message: personalizedMessage,
          userId: campaign.userId,
          mediaUrl: campaign.mediaUrl ?? undefined,
          mediaType: campaign.mediaType as 'image' | 'video' | 'document' | undefined,
        });

        if (user.subscription.status === 'TRIAL') {
          await prisma.subscription.update({
            where: { id: user.subscription.id },
            data: {
              messageCount: user.subscription.messageCount + 1,
            },
          });
          user.subscription.messageCount += 1;
          console.log(`[Campaign] Compteur trial incrémenté: ${user.subscription.messageCount}/50`);

          // Alerte quota 80% (40/50 messages)
          if (user.subscription.messageCount === 40 && user.phone) {
            try {
              const TRIAL_LIMIT = 50;
              const percentUsed = Math.round((user.subscription.messageCount / TRIAL_LIMIT) * 100);
              await SystemMessagesService.sendQuotaWarning(
                user.phone,
                'messages d\'essai',
                percentUsed,
                TRIAL_LIMIT - user.subscription.messageCount,
                TRIAL_LIMIT
              );
              console.log(`[Campaign] ⚠️ Alerte quota 80% envoyée à ${user.phone}`);
            } catch (e) {
              console.error(`[Campaign] Erreur notification quota:`, e);
            }
          }
        }

        successCount++;

        // Persist processedCount to DB after EVERY message for crash resilience
        await updateCampaign(campaign.id, { processedCount: successCount });

        console.log(`[Campaign] Message ajouté pour ${recipient} (${successCount}/${campaign.totalCount})`);
      }

      // Forcer le passage à COMPLETED à la fin de la boucle
      await updateCampaign(campaign.id, { 
        status: 'COMPLETED',
        processedCount: successCount 
      });
      
      console.log(`[Campaign] ✅ Campagne ${campaign.id} terminée - ${successCount}/${campaign.totalCount} messages envoyés`);
      
      // Envoyer notification de fin de campagne
      try {
        if (user?.phone) {
          await SystemMessagesService.sendBroadcastComplete(
            user.phone,
            campaign.name,
            successCount,
            campaign.totalCount
          );
          console.log(`[Campaign] 📱 Notification de fin envoyée à ${user.phone}: ${successCount} messages`);
        }
      } catch (notifError) {
        console.error(`[Campaign] Erreur notification:`, notifError);
      }
    }
  } catch (error) {
    console.error('[Campaign] Erreur lors du traitement des campagnes:', error);
  } finally {
    isProcessing = false;
  }
}

setInterval(processCampaigns, 30000);

console.log('✅ CampaignWorker initialized (check every 30s)');

export default processCampaigns;
