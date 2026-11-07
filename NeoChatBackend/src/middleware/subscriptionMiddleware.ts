import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from './authMiddleware';

const TRIAL_MESSAGE_LIMIT = 50;

export async function checkSubscriptionStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user || !user.subscription) {
      return next();
    }

    const subscription = user.subscription;
    const now = new Date();

    if (subscription.status === 'TRIAL') {
      const trialExpired = subscription.trialEndsAt && subscription.trialEndsAt < now;
      const messagesExceeded = subscription.messageCount >= TRIAL_MESSAGE_LIMIT;

      if (trialExpired || messagesExceeded) {
        console.log(`[Subscription] Passage en EXPIRED pour l'utilisateur ${userId}`);
        console.log(`[Subscription] Raison: ${trialExpired ? 'Période d\'essai expirée' : '50 messages atteints'}`);

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        });

        return res.status(403).json({
          success: false,
          error: 'Abonnement expiré',
          reason: trialExpired ? 'trial_expired' : 'message_limit_reached',
          details: {
            trialEndsAt: subscription.trialEndsAt,
            messageCount: subscription.messageCount,
            messageLimit: TRIAL_MESSAGE_LIMIT,
          },
        });
      }
    }

    if (subscription.status === 'DIFFUSION' || subscription.status === 'ASSISTANT' || subscription.status === 'PREMIUM') {
      const billingExpired = subscription.nextBillingAt && subscription.nextBillingAt < now;

      if (billingExpired) {
        console.log(`[Subscription] Passage en EXPIRED pour l'utilisateur ${userId} (facturation échue)`);

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        });

        return res.status(403).json({
          success: false,
          error: 'Abonnement expiré',
          reason: 'billing_expired',
          details: {
            nextBillingAt: subscription.nextBillingAt,
          },
        });
      }
    }

    if (subscription.status === 'EXPIRED') {
      return res.status(403).json({
        success: false,
        error: 'Abonnement expiré',
        reason: 'already_expired',
        message: 'Veuillez renouveler votre abonnement pour continuer à utiliser NeoChat',
      });
    }

    next();

  } catch (error: any) {
    console.error('[Subscription Middleware] Erreur:', error);
    next();
  }
}
