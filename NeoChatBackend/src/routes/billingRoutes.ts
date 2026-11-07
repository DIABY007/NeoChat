import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { createMaketouCheckout } from '../services/maketouService';
import SystemMessagesService from '../services/systemMessagesService';

const router = Router();

// Plans tarifaires
const PLANS = {
  assistant: {
    id: 'ASSISTANT',
    name: 'Assistant IA',
    price: 7500,
    messages: -1,
    productDocumentId: 'cd457712-904e-4288-a27c-9d48aadf0d3c',
    productDocumentIdWithDiscount: '209da9ad-ee4b-40a9-92ab-64015a57824f',
  },
  diffusion: {
    id: 'DIFFUSION',
    name: 'Diffusion',
    price: 5000,
    messages: -1,
    productDocumentId: 'e98b7ab5-8d5e-4525-8942-3a5243b6580e',
    productDocumentIdWithDiscount: 'dd397bbc-7508-40d6-a045-7e16912a8b58',
  },
  premium: {
    id: 'PREMIUM',
    name: 'Premium',
    price: 10000,
    messages: -1,
    productDocumentId: 'c27715aa-7138-4fef-91e9-e0b50a6c4e70',
    productDocumentIdWithDiscount: '7fcfc00d-54e2-4b44-86bd-cdaec259b91f',
  },
};

router.post('/create-checkout', authenticate, async (req: AuthRequest, res: Response) => {
  // Passerelle de paiement en ligne temporairement désactivée
  return res.status(503).json({
    success: false,
    error: 'Le paiement en ligne est temporairement désactivé pour maintenance. Veuillez contacter le support WhatsApp (+226 56 63 60 39) pour activer votre forfait manuellement.',
  });
});

/* Ancien gestionnaire Maketou désactivé:
router.post('/create-checkout-disabled'
        error: 'Utilisateur non trouvé',
      });
    }

    // Vérifier si l'utilisateur a été parrainé pour appliquer la réduction
    const hasReferral = !!user.referredBy;
    
    // Choisir l'ID Maketou approprié (avec ou sans remise de 10%)
    const productDocumentId = hasReferral 
      ? selectedPlan.productDocumentIdWithDiscount 
      : selectedPlan.productDocumentId;
    
    const discountPercentage = hasReferral ? 10 : 0;
    const finalPrice = Math.round(selectedPlan.price * (1 - discountPercentage / 100));

    console.log(`[Billing] ========== CRÉATION CHECKOUT ==========`);
    console.log(`[Billing] Utilisateur: ${user.phone}`);
    console.log(`[Billing] Plan sélectionné: ${selectedPlan.name}`);
    console.log(`[Billing] Utilisateur parrainé (referredBy): ${hasReferral ? 'OUI ✅' : 'NON ❌'}`);
    console.log(`[Billing] referredBy value: ${user.referredBy || 'null'}`);
    console.log(`[Billing] Product ID STANDARD: ${selectedPlan.productDocumentId}`);
    console.log(`[Billing] Product ID REMISÉ: ${selectedPlan.productDocumentIdWithDiscount}`);
    console.log(`[Billing] Product ID UTILISÉ: ${productDocumentId}`);
    console.log(`[Billing] Prix original: ${selectedPlan.price} FCFA`);
    console.log(`[Billing] Réduction: ${discountPercentage}%`);
    console.log(`[Billing] Prix final: ${finalPrice} FCFA`);
    console.log(`[Billing] ==========================================`);

    // Créer le panier Maketou
    const checkout = await createMaketouCheckout({
      productDocumentId,
      email: `${user.phone}@neochat.pro`,
      firstName: user.firstName || 'Client',
      lastName: user.lastName || 'NeoChat',
      phone: user.phone,
      redirectURL: process.env.SITE_URL ? `${process.env.SITE_URL}/dashboard` : 'https://neochat.pro/dashboard',
      meta: {
        userId: user.id,
        subscriptionId: user.subscription?.id || '',
        plan: selectedPlan.id,
        referralCode: user.referralCode,
        referredBy: user.referredBy || undefined,
      },
    });

    console.log(`[Billing] ✅ Checkout créé: ${checkout.cartId}`);

    // Envoyer notification de code promo/parrainage validé
    if (hasReferral && user.phone) {
      try {
        const discount = selectedPlan.price - finalPrice;
        await SystemMessagesService.sendPromoCodeConfirmation(
          user.phone,
          user.firstName || user.lastName || 'cher utilisateur',
          discount
        );
        console.log(`[Billing] 🎁 Notification code promo envoyée à ${user.phone}`);
      } catch (notifError) {
        console.error(`[Billing] Erreur notification promo:`, notifError);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        cartId: checkout.cartId,
        redirectUrl: checkout.redirectUrl,
        plan: selectedPlan.name,
        originalPrice: selectedPlan.price,
        finalPrice,
        discount: hasReferral ? 1000 : 0,
      },
    });

  } catch (error: any) {
    console.error('[Billing] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});
*/

// Récupérer les plans disponibles
router.get('/plan', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const hasReferral = !!user?.referredBy;
    const discountPercentage = hasReferral ? 10 : 0;
    const discountAmount = Math.round(PLANS.premium.price * discountPercentage / 100);

    // Retourner un plan par défaut pour la compatibilité
    const defaultPlan = {
      id: PLANS.premium.id,
      name: PLANS.premium.name,
      price: PLANS.premium.price,
      messages: PLANS.premium.messages,
      discount: discountAmount,
      finalPrice: PLANS.premium.price - discountAmount,
    };

    return res.status(200).json({
      success: true,
      data: {
        plan: defaultPlan,
        hasReferral,
      },
    });

  } catch (error: any) {
    console.error('[Billing] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
    });
  }
});

export default router;
