import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

const SUBSCRIPTION_PRICE = 10000;
const REFERRAL_DISCOUNT = 1000;

router.post('/simulate-checkout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user || !user.subscription) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur ou abonnement non trouvé',
      });
    }

    let finalAmount = SUBSCRIPTION_PRICE;
    let discount = 0;
    let hasReferral = false;
    let referrerInfo = null;

    if (user.referredBy) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: user.referredBy },
      });

      if (referrer) {
        discount = REFERRAL_DISCOUNT;
        finalAmount = SUBSCRIPTION_PRICE - REFERRAL_DISCOUNT;
        hasReferral = true;
        referrerInfo = {
          referralCode: referrer.referralCode,
          phone: referrer.phone,
        };
      }
    }

    const mockCheckout = {
      cartId: `mock_cart_${Date.now()}`,
      paymentUrl: `https://pay.maketou.sn/checkout/mock_cart_${Date.now()}`,
      amount: finalAmount,
      originalAmount: SUBSCRIPTION_PRICE,
      discount: discount,
      hasReferral: hasReferral,
      currency: 'XOF',
      metadata: {
        userId: user.id,
        subscriptionId: user.subscription.id,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        referrerInfo: referrerInfo,
      },
    };

    console.log(`[Test Payment] Simulation de checkout pour ${user.phone}`);
    console.log(`[Test Payment] Prix original: ${SUBSCRIPTION_PRICE} FCFA`);
    console.log(`[Test Payment] Remise parrainage: ${discount} FCFA`);
    console.log(`[Test Payment] Prix final: ${finalAmount} FCFA`);

    return res.status(200).json({
      success: true,
      message: 'Simulation de checkout (Maketou API non disponible)',
      data: mockCheckout,
    });

  } catch (error: any) {
    console.error('[Test Payment] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.post('/simulate-webhook', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { cartId, status } = req.body;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        error: 'cartId est requis',
      });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        maketouCartId: cartId,
      },
      include: { user: true },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Abonnement non trouvé avec ce cartId',
      });
    }

    const mockWebhook = {
      cart_id: cartId,
      status: status || 'paid',
      amount: 9000,
      currency: 'XOF',
      metadata: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
      },
    };

    console.log(`[Test Payment] Simulation de webhook Maketou pour cartId: ${cartId}`);

    const webhookResponse = await fetch('http://localhost:3001/api/payment/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockWebhook),
    });

    const webhookData = await webhookResponse.json();

    const updatedSubscription = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: { user: true },
    });

    let referrerBalance = null;
    if (updatedSubscription?.user.referredBy) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: updatedSubscription.user.referredBy },
      });
      if (referrer) {
        referrerBalance = referrer.walletBalance;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Simulation de webhook Maketou',
      data: {
        webhookResponse: webhookData,
        subscription: {
          status: updatedSubscription?.status,
          messageCount: updatedSubscription?.messageCount,
          nextBillingAt: updatedSubscription?.nextBillingAt,
        },
        referrerBalance: referrerBalance,
      },
    });

  } catch (error: any) {
    console.error('[Test Payment] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
