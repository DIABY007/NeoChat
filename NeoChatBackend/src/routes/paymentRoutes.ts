import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { createMaketouCheckout } from '../services/maketouService';
import { SystemMessagesService } from '../services/systemMessagesService';
import { posthogNode } from '../lib/analytics';

const router = Router();

const PLANS = {
  ASSISTANT: {
    name: 'ASSISTANT',
    price: 7500,
    maketouProductId: 'cd457712-904e-4288-a27c-9d48aadf0d3c',
  },
  DIFFUSION: {
    name: 'DIFFUSION',
    price: 5000,
    maketouProductId: 'e98b7ab5-8d5e-4525-8942-3a5243b6580e',
  },
  PREMIUM: {
    name: 'PREMIUM',
    price: 10000,
    maketouProductId: 'c27715aa-7138-4fef-91e9-e0b50a6c4e70',
  },
};

const REFERRAL_DISCOUNT = 1000;
const CURRENCY = 'XOF';

router.get('/plans', async (req, res: Response) => {
  try {
    const plans = Object.values(PLANS).map(plan => ({
      name: plan.name,
      price: plan.price,
      currency: CURRENCY,
      features: getPlanFeatures(plan.name),
    }));

    return res.status(200).json({
      success: true,
      data: {
        plans,
        referralDiscount: REFERRAL_DISCOUNT,
        currency: CURRENCY,
      },
    });
  } catch (error: any) {
    console.error('[Payment] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
    });
  }
});

function getPlanFeatures(planName: string) {
  switch (planName) {
    case 'ASSISTANT':
      return {
        messageLimit: 'Illimité',
        aiAssistant: true,
        broadcast: false,
        knowledgeBase: true,
        support: 'Standard',
      };
    case 'DIFFUSION':
      return {
        messageLimit: 'Illimité',
        aiAssistant: false,
        broadcast: true,
        knowledgeBase: false,
        support: 'Standard',
      };
    case 'PREMIUM':
      return {
        messageLimit: 'Illimité',
        aiAssistant: true,
        broadcast: true,
        knowledgeBase: true,
        support: 'Prioritaire',
      };
    default:
      return {};
  }
}

router.post('/checkout', authenticate, async (req: AuthRequest, res: Response) => {
  // Passerelle de paiement en ligne temporairement désactivée
  return res.status(503).json({
    success: false,
    error: 'Le paiement en ligne est temporairement désactivé pour maintenance. Veuillez contacter le support WhatsApp (+226 56 63 60 39) pour activer votre formule.',
  });
});

/* Ancien checkout Maketou désactivé:
router.post('/checkout-disabled'

    try {
      const checkout = await createMaketouCheckout({
        productDocumentId: productId,
        email: `${user.phone}@neochat.pro`,
        firstName: user.firstName || 'Client',
        lastName: user.lastName || 'NeoChat',
        phone: user.phone,
        redirectURL: returnUrl,
        meta: {
          userId: user.id,
          subscriptionId: user.subscription.id,
          plan: selectedPlan.name,
          referralCode: user.referralCode,
          referredBy: user.referredBy || undefined,
        },
      });

      await prisma.subscription.update({
        where: { id: user.subscription.id },
        data: {
          maketouCartId: checkout.cartId,
        },
      });

      console.log(`[Payment] ✅ Lien de paiement généré: ${checkout.redirectUrl}`);

      return res.status(200).json({
        success: true,
        message: 'Lien de paiement généré avec succès',
        data: {
          paymentUrl: checkout.redirectUrl,
          cartId: checkout.cartId,
          plan: selectedPlan.name,
          amount: finalAmount,
          originalAmount: selectedPlan.price,
          discount: discount,
          hasReferral: hasReferral,
          currency: CURRENCY,
        },
      });

    } catch (maketouError: any) {
      console.error(`[Payment] Erreur Maketou:`, maketouError.message);

      return res.status(503).json({
        success: false,
        error: 'Service de paiement temporairement indisponible',
        details: process.env.NODE_ENV === 'development' ? maketouError.message : undefined,
      });
    }

  } catch (error: any) {
    console.error('[Payment] Erreur lors de la création du checkout:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});
*/

router.get('/status/:cartId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { cartId } = req.params;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        maketouCartId: cartId,
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        cartId: subscription.maketouCartId,
        status: subscription.status,
        messageCount: subscription.messageCount,
        nextBillingAt: subscription.nextBillingAt,
      },
    });

  } catch (error: any) {
    console.error('[Payment] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.post('/webhook', async (req, res: Response) => {
  try {
    const { cart_id, status, amount, metadata } = req.body;

    console.log(`[Payment Webhook] Notification reçue pour cartId: ${cart_id}, status: ${status}`);

    if (!cart_id || !status) {
      return res.status(400).json({
        success: false,
        error: 'cart_id et status sont requis',
      });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { maketouCartId: cart_id },
      include: { user: true },
    });

    if (!subscription) {
      console.log(`[Payment Webhook] Abonnement non trouvé pour cartId: ${cart_id}`);
      return res.status(404).json({
        success: false,
        error: 'Abonnement non trouvé',
      });
    }

    if (status === 'paid' || status === 'completed' || status === 'success') {
      console.log(`[Payment Webhook] Paiement validé pour l'utilisateur ${subscription.userId}`);

      const planFromMeta = metadata?.plan || 'DIFFUSION';
      const now = new Date();
      const nextBillingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const newPaymentCount = (subscription.paymentCount || 0) + 1;
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: planFromMeta,
          messageCount: 0,
          paymentCount: newPaymentCount,
          nextBillingAt: nextBillingDate,
          trialEndsAt: nextBillingDate,
        },
      });

      console.log(`[Payment Webhook] ✅ Abonnement ${planFromMeta} activé - Override complet - Expire le ${nextBillingDate.toISOString()}`);

      const hadDiscount = !!subscription.user.referredBy;
      const isFirstPayment = subscription.status === 'TRIAL' || subscription.status === 'EXPIRED';
      const isRenewal = ['DIFFUSION', 'ASSISTANT', 'PREMIUM'].includes(subscription.status);

      posthogNode.capture({
        distinctId: subscription.userId,
        event: 'payment_completed',
        properties: {
          plan: planFromMeta,
          amount_fcfa: amount || 0,
          currency: CURRENCY,
          cart_id: cart_id,
          payment_method: 'mobile_money',
          has_referral_discount: hadDiscount,
          is_first_payment: isFirstPayment,
          subscription_type: `${planFromMeta}_${hadDiscount ? 'promo' : 'standard'}`,
        },
      });

      posthogNode.capture({
        distinctId: subscription.userId,
        event: isRenewal ? 'subscription_renewed' : 'subscription_activated',
        properties: {
          plan: planFromMeta,
          amount_fcfa: amount || 0,
          currency: CURRENCY,
          next_billing_at: nextBillingDate.toISOString(),
          previous_status: subscription.status,
          has_referral_discount: hadDiscount,
          subscription_type: `${planFromMeta}_${hadDiscount ? 'promo' : 'standard'}`,
          ...(isRenewal ? { renewal_count: newPaymentCount } : {}),
        },
      });

      // Envoyer une notification WhatsApp de succès
      try {
        await SystemMessagesService.sendPaymentSuccess(
          subscription.user.phone,
          subscription.user.firstName || 'Client',
          planFromMeta
        );
        console.log(`[Payment Webhook] ✅ Notification de paiement réussi envoyée à ${subscription.user.phone}`);
      } catch (notifError: any) {
        console.error(`[Payment Webhook] ⚠️ Erreur lors de l'envoi de la notification:`, notifError.message);
      }

      if (subscription.user.referredBy) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: subscription.user.referredBy },
        });

        if (referrer) {
          const REFERRAL_COMMISSION_RATE = 0.20;
          const commission = Math.floor(amount * REFERRAL_COMMISSION_RATE);

          await prisma.user.update({
            where: { id: referrer.id },
            data: {
              walletBalance: referrer.walletBalance + commission,
            },
          });

          // Créer un enregistrement AffiliatePayment pour tracker la commission
          await prisma.affiliatePayment.create({
            data: {
              userId: referrer.id,
              amount: commission,
              paymentMethod: 'COMMISSION',
              paymentDetails: `Parrainage de ${subscription.user.phone}`,
              status: 'COMPLETED',
              processedAt: new Date(),
              notes: `Commission 20% sur paiement ${planFromMeta} de ${amount} FCFA`,
            },
          });

          console.log(`[Payment Webhook] ✅ Commission de ${commission} FCFA (20% de ${amount} FCFA) ajoutée au parrain ${referrer.referralCode}`);
          console.log(`[Payment Webhook] Nouvelle balance du parrain: ${referrer.walletBalance + commission} FCFA`);
        }
      }

      console.log(`[Payment Webhook] ✅ Paiement traité avec succès`);

      return res.status(200).json({
        success: true,
        message: 'Paiement validé et abonnement activé',
      });

    } else if (status === 'failed' || status === 'cancelled') {
      console.log(`[Payment Webhook] Paiement échoué/annulé pour cartId: ${cart_id}`);

      posthogNode.capture({
        distinctId: subscription.userId,
        event: 'payment_failed',
        properties: {
          plan: metadata?.plan || 'unknown',
          amount_fcfa: amount || 0,
          error_reason: status,
          cart_id: cart_id,
        },
      });

      // Envoyer une notification WhatsApp d'échec
      try {
        await SystemMessagesService.sendPaymentFailed(subscription.user.phone);
        console.log(`[Payment Webhook] ✅ Notification d'échec de paiement envoyée à ${subscription.user.phone}`);
      } catch (notifError: any) {
        console.error(`[Payment Webhook] ⚠️ Erreur lors de l'envoi de la notification:`, notifError.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Paiement échoué/annulé',
      });

    } else {
      console.log(`[Payment Webhook] Statut inconnu: ${status}`);

      return res.status(200).json({
        success: true,
        message: 'Statut reçu',
      });
    }

  } catch (error: any) {
    console.error('[Payment Webhook] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
