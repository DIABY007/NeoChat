import prisma from '../config/prisma';
import SystemMessagesService from '../services/systemMessagesService';

const TRIAL_MESSAGE_LIMIT = 50;

export async function checkExpiredSubscriptions() {
  try {
    const now = new Date();

    // 1. Trials expirés par date
    const trialExpiredByDate = await prisma.subscription.findMany({
      where: {
        status: 'TRIAL',
        trialEndsAt: { lt: now },
      },
      include: { user: true },
    });

    for (const sub of trialExpiredByDate) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      try {
        if (sub.user.phone) {
          await SystemMessagesService.sendServiceSuspended(sub.user.phone, sub.user.firstName || sub.user.lastName || 'cher utilisateur');
        }
      } catch (e) { console.error(`[Subscription Worker] Erreur notif suspension ${sub.user.phone}:`, e); }
    }

    if (trialExpiredByDate.length > 0) {
      console.log(`[Subscription Worker] ${trialExpiredByDate.length} abonnements TRIAL expirés (date)`);
    }

    // 2. Trials expirés par limite de messages
    const trialExpiredByMessages = await prisma.subscription.findMany({
      where: {
        status: 'TRIAL',
        messageCount: { gte: TRIAL_MESSAGE_LIMIT },
      },
      include: { user: true },
    });

    for (const sub of trialExpiredByMessages) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      try {
        if (sub.user.phone) {
          await SystemMessagesService.sendQuotaExhausted(sub.user.phone, 'messages d\'essai (50 messages)');
        }
      } catch (e) { console.error(`[Subscription Worker] Erreur notif quota ${sub.user.phone}:`, e); }
    }

    if (trialExpiredByMessages.length > 0) {
      console.log(`[Subscription Worker] ${trialExpiredByMessages.length} abonnements TRIAL expirés (50 messages)`);
    }

    // 3. Abonnements payants expirés (facturation échue)
    const billingExpired = await prisma.subscription.findMany({
      where: {
        status: { in: ['DIFFUSION', 'ASSISTANT', 'PREMIUM'] },
        nextBillingAt: { lt: now },
      },
      include: { user: true },
    });

    for (const sub of billingExpired) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      try {
        if (sub.user.phone) {
          await SystemMessagesService.sendServiceSuspended(sub.user.phone, sub.user.firstName || sub.user.lastName || 'cher utilisateur');
        }
      } catch (e) { console.error(`[Subscription Worker] Erreur notif suspension ${sub.user.phone}:`, e); }
    }

    if (billingExpired.length > 0) {
      console.log(`[Subscription Worker] ${billingExpired.length} abonnements payants expirés (facturation)`);
    }

  } catch (error) {
    console.error('[Subscription Worker] Erreur lors de la vérification:', error);
  }
}

setInterval(checkExpiredSubscriptions, 60000);

console.log('✅ SubscriptionWorker initialized (check every 60s)');

export default checkExpiredSubscriptions;
