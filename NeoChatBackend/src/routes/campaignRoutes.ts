import { Router, Response, Request } from 'express';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { checkSubscriptionStatus } from '../middleware/subscriptionMiddleware';
import { requireBroadcastAccess } from '../middleware/planMiddleware';
import { createCampaign, getUserCampaigns, getCampaign, duplicateCampaign, deleteCampaign, pauseCampaign, resumeCampaign, updateCampaign } from '../models/Campaign';
import { hasSpintax } from '../utils/spintax';
import { processCampaigns } from '../workers/campaignWorker';

const router = Router();

router.post('/create', authenticate, checkSubscriptionStatus, requireBroadcastAccess, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceName, name, message, recipients, scheduledAt, mediaUrl, mediaType } = req.body;

    if (!instanceName || !name || !message || !recipients || !scheduledAt) {
      return res.status(400).json({
        success: false,
        error: 'Tous les champs sont requis: instanceName, name, message, recipients, scheduledAt',
      });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'recipients doit être un tableau non vide',
      });
    }

    console.log(`[Campaign] Création de campagne pour l'utilisateur ${userId}`);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user || !user.subscription) {
      return res.status(403).json({
        success: false,
        error: 'Aucun abonnement actif',
      });
    }

    if (user.subscription.status === 'TRIAL') {
      if (recipients.length > 10) {
        return res.status(403).json({
          success: false,
          error: 'En période d\'essai, vous êtes limité à 10 destinataires par diffusion',
          details: {
            requested: recipients.length,
            limit: 10,
          },
        });
      }

      const remainingMessages = 50 - user.subscription.messageCount;
      if (recipients.length > remainingMessages) {
        return res.status(403).json({
          success: false,
          error: `Vous n'avez plus assez de messages disponibles. Il vous reste ${remainingMessages} messages sur votre quota trial de 50 messages.`,
          details: {
            requested: recipients.length,
            remaining: remainingMessages,
            totalLimit: 50,
          },
        });
      }
    }

    const instance = await prisma.instance.findFirst({
      where: {
        userId,
        instanceName,
      },
    });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance non trouvée',
      });
    }

    if (user.subscription.status === 'EXPIRED') {
      return res.status(403).json({
        success: false,
        error: 'Abonnement expiré',
      });
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'La date de programmation doit être dans le futur',
      });
    }

    const campaign = await createCampaign({
      userId,
      instanceName,
      name,
      message,
      mediaUrl,
      mediaType,
      recipients,
      scheduledAt: scheduledDate,
      status: 'PENDING',
    });

    console.log(`[Campaign] ✅ Campagne créée: ${campaign.id} - ${recipients.length} destinataires`);
    console.log(`[Campaign] Programmée pour: ${scheduledDate.toISOString()}`);
    console.log(`[Campaign] Spintax détecté: ${hasSpintax(message)}`);

    return res.status(201).json({
      success: true,
      message: 'Campagne créée avec succès',
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          recipientsCount: campaign.totalCount,
          scheduledAt: campaign.scheduledAt,
          status: campaign.status,
          hasSpintax: hasSpintax(message),
        },
      },
    });

  } catch (error: any) {
    console.error('[Campaign] Erreur lors de la création:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.get('/list', authenticate, requireBroadcastAccess, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const campaigns = await getUserCampaigns(userId);

    return res.status(200).json({
      success: true,
      data: {
        campaigns: campaigns.map(c => ({
          id: c.id,
          name: c.name,
          instanceName: c.instanceName,
          recipientsCount: c.totalCount,
          processedCount: c.processedCount,
          scheduledAt: c.scheduledAt,
          status: c.status,
          createdAt: c.createdAt,
        })),
        total: campaigns.length,
      },
    });

  } catch (error: any) {
    console.error('[Campaign] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.get('/:campaignId', authenticate, requireBroadcastAccess, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { campaignId } = req.params;

    const campaign = await getCampaign(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campagne non trouvée',
      });
    }

    if (campaign.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          instanceName: campaign.instanceName,
          message: campaign.message,
          recipients: campaign.recipients,
          recipientsCount: campaign.totalCount,
          processedCount: campaign.processedCount,
          scheduledAt: campaign.scheduledAt,
          status: campaign.status,
          createdAt: campaign.createdAt,
        },
      },
    });

  } catch (error: any) {
    console.error('[Campaign] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Dupliquer une campagne
router.post('/:campaignId/duplicate', authenticate, requireBroadcastAccess, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { campaignId } = req.params;

    const duplicated = await duplicateCampaign(campaignId, userId);

    if (!duplicated) {
      return res.status(404).json({
        success: false,
        error: 'Campagne non trouvée ou accès non autorisé',
      });
    }

    console.log(`[Campaign] ✅ Campagne dupliquée: ${duplicated.id}`);

    return res.status(201).json({
      success: true,
      message: 'Campagne dupliquée avec succès',
      data: {
        campaign: {
          id: duplicated.id,
          name: duplicated.name,
          instanceName: duplicated.instanceName,
          recipientsCount: duplicated.totalCount,
          scheduledAt: duplicated.scheduledAt,
          status: duplicated.status,
        },
      },
    });

  } catch (error: any) {
    console.error('[Campaign] Erreur lors de la duplication:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Modifier une campagne
router.put('/:campaignId', authenticate, requireBroadcastAccess, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { campaignId } = req.params;
    const { name, message, scheduledAt, mediaUrl, mediaType } = req.body;

    const campaign = await getCampaign(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campagne non trouvée',
      });
    }

    if (campaign.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
    }

    if (campaign.status === 'PROCESSING' || campaign.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Impossible de modifier une campagne en cours ou terminée',
      });
    }

    const updates: Partial<typeof campaign> = {};
    if (name) updates.name = name;
    if (message) updates.message = message;
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'La date de programmation doit être dans le futur',
        });
      }
      updates.scheduledAt = scheduledDate;
    }
    if (mediaUrl !== undefined) updates.mediaUrl = mediaUrl;
    if (mediaType !== undefined) updates.mediaType = mediaType;

    const updated = await updateCampaign(campaignId, updates);

    console.log(`[Campaign] ✅ Campagne modifiée: ${campaignId}`);

    return res.status(200).json({
      success: true,
      message: 'Campagne modifiée avec succès',
      data: {
        campaign: {
          id: updated!.id,
          name: updated!.name,
          message: updated!.message,
          scheduledAt: updated!.scheduledAt,
          status: updated!.status,
        },
      },
    });

  } catch (error: any) {
    console.error('[Campaign] Erreur lors de la modification:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Supprimer une campagne
router.delete('/:campaignId', authenticate, requireBroadcastAccess, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { campaignId } = req.params;

    const deleted = await deleteCampaign(campaignId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Campagne non trouvée, accès non autorisé ou campagne en cours',
      });
    }

    console.log(`[Campaign] ✅ Campagne supprimée: ${campaignId}`);

    return res.status(200).json({
      success: true,
      message: 'Campagne supprimée avec succès',
    });

  } catch (error: any) {
    console.error('[Campaign] Erreur lors de la suppression:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Mettre en pause une campagne
router.post('/:campaignId/pause', authenticate, requireBroadcastAccess, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { campaignId } = req.params;

    const paused = await pauseCampaign(campaignId, userId);

    if (!paused) {
      return res.status(404).json({
        success: false,
        error: 'Campagne non trouvée, accès non autorisé ou statut invalide',
      });
    }

    console.log(`[Campaign] ⏸️ Campagne mise en pause: ${campaignId}`);

    return res.status(200).json({
      success: true,
      message: 'Campagne mise en pause',
      data: {
        campaign: {
          id: paused.id,
          status: paused.status,
        },
      },
    });

  } catch (error: any) {
    console.error('[Campaign] Erreur lors de la mise en pause:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Reprendre une campagne
router.post('/:campaignId/resume', authenticate, requireBroadcastAccess, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { campaignId } = req.params;

    const resumed = await resumeCampaign(campaignId, userId);

    if (!resumed) {
      return res.status(404).json({
        success: false,
        error: 'Campagne non trouvée, accès non autorisé ou statut invalide',
      });
    }

    console.log(`[Campaign] ▶️ Campagne reprise: ${campaignId}`);

    return res.status(200).json({
      success: true,
      message: 'Campagne reprise',
      data: {
        campaign: {
          id: resumed.id,
          status: resumed.status,
        },
      },
    });

  } catch (error: any) {
    console.error('[Campaign] Erreur lors de la reprise:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Route publique pour exécuter les campagnes programmées (appelée par cron-job.org)
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { cronSecret } = req.body;
    const expectedSecret = process.env.CRON_SECRET || 'your-secret-key-here';

    // Vérifier le secret pour sécuriser l'endpoint
    if (cronSecret !== expectedSecret) {
      console.log('[Campaign] Tentative d\'exécution avec secret invalide');
      return res.status(401).json({
        success: false,
        error: 'Secret invalide',
      });
    }

    console.log('[Campaign] Déclenchement manuel de l\'exécution des campagnes');
    
    // Exécuter le traitement des campagnes
    await processCampaigns();

    return res.status(200).json({
      success: true,
      message: 'Exécution des campagnes déclenchée',
    });

  } catch (error: any) {
    console.error('[Campaign] Erreur lors de l\'exécution:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
