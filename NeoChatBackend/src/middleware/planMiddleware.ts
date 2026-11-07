import { Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from './authMiddleware';

type PlanType = 'TRIAL' | 'ASSISTANT' | 'DIFFUSION' | 'PREMIUM';

/**
 * Middleware pour restreindre l'accès aux fonctionnalités selon le plan d'abonnement
 * 
 * Hiérarchie des plans:
 * - TRIAL: Accès limité (50 messages, 10 diffusions max)
 * - ASSISTANT: Bot IA + Base de connaissances uniquement
 * - DIFFUSION: Campagnes marketing uniquement
 * - PREMIUM: Toutes les fonctionnalités
 */
export function requirePlan(...allowedPlans: PlanType[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentification requise',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user || !user.subscription) {
        return res.status(403).json({
          success: false,
          error: 'Abonnement requis',
        });
      }

      const currentPlan = user.subscription.status;

      // Vérifier si le plan actuel est autorisé
      if (!allowedPlans.includes(currentPlan as PlanType)) {
        console.log(`[Plan Middleware] Accès refusé: ${currentPlan} tente d'accéder à une fonctionnalité réservée à ${allowedPlans.join(', ')}`);
        
        return res.status(403).json({
          success: false,
          error: 'Fonctionnalité non disponible avec votre plan actuel',
          details: {
            currentPlan,
            requiredPlans: allowedPlans,
            message: getUpgradeMessage(currentPlan as PlanType, allowedPlans),
          },
        });
      }

      next();
    } catch (error: any) {
      console.error('[Plan Middleware] Erreur:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la vérification du plan',
      });
    }
  };
}

/**
 * Message personnalisé selon le plan actuel et les plans requis
 */
function getUpgradeMessage(currentPlan: PlanType, requiredPlans: PlanType[]): string {
  if (currentPlan === 'TRIAL') {
    return 'Cette fonctionnalité nécessite un abonnement payant. Passez à un plan premium pour y accéder.';
  }

  if (currentPlan === 'ASSISTANT' && requiredPlans.includes('DIFFUSION')) {
    return 'Les campagnes de diffusion nécessitent le plan Diffusion ou Premium.';
  }

  if (currentPlan === 'DIFFUSION' && requiredPlans.includes('ASSISTANT')) {
    return 'Le bot IA et la base de connaissances nécessitent le plan Assistant ou Premium.';
  }

  if (requiredPlans.includes('PREMIUM') && !requiredPlans.includes(currentPlan)) {
    return 'Cette fonctionnalité est réservée aux abonnés Premium.';
  }

  return 'Votre plan actuel ne permet pas d\'accéder à cette fonctionnalité.';
}

/**
 * Middleware spécifique pour les fonctionnalités de diffusion
 * Accessible avec TRIAL (limité), DIFFUSION ou PREMIUM
 */
export const requireBroadcastAccess = requirePlan('TRIAL', 'DIFFUSION', 'PREMIUM');

/**
 * Middleware spécifique pour les fonctionnalités d'assistant IA
 * Accessible avec TRIAL (limité), ASSISTANT ou PREMIUM
 */
export const requireAssistantAccess = requirePlan('TRIAL', 'ASSISTANT', 'PREMIUM');

/**
 * Middleware spécifique pour les fonctionnalités premium
 * Accessible uniquement avec PREMIUM
 */
export const requirePremiumAccess = requirePlan('PREMIUM');
