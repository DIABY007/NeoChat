import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import prisma from '../config/prisma';
import { processTextAndStoreForBot, processPDFAndStoreForBot } from '../services/knowledgeService';
import SystemMessagesService from '../services/systemMessagesService';
import { posthogNode } from '../lib/analytics';

const router = Router();

// Configuration multer pour l'upload de documents et images (PDF, JPG, PNG, WEBP)
const allowedKnowledgeMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (req, file, cb) => {
    if (allowedKnowledgeMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF et images (JPG, PNG, WEBP) sont acceptés'));
    }
  },
});

// ==================== GESTION DES PARAMÈTRES DU BOT ====================

/**
 * Mettre à jour les paramètres du bot (systemPrompt, isBotActive)
 * PUT /bot-config/:instanceId/settings
 */
router.put('/:instanceId/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceId } = req.params;
    const { systemPrompt, isBotActive, triggerWord, adminPhone } = req.body;

    console.log(`[BotConfig] Mise à jour des paramètres pour instance ${instanceId}`);

    // Vérifier que l'instance appartient à l'utilisateur et récupérer le plan
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        userId,
      },
      include: {
        user: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance non trouvée',
      });
    }

    // Seuls les plans TRIAL, ASSISTANT et PREMIUM peuvent activer le bot (DIFFUSION et EXPIRED bloqués)
    const subscriptionStatus = instance.user.subscription?.status;
    const canActivateBot = subscriptionStatus === 'PREMIUM' || subscriptionStatus === 'ASSISTANT' || subscriptionStatus === 'TRIAL';
    const finalIsBotActive = !canActivateBot ? false : (isBotActive !== undefined ? isBotActive : instance.isBotActive);

    // Mise à jour des paramètres
    const updatedInstance = await prisma.instance.update({
      where: { id: instanceId },
      data: {
        systemPrompt: systemPrompt !== undefined ? systemPrompt : instance.systemPrompt,
        triggerWord: triggerWord !== undefined ? triggerWord : instance.triggerWord,
        adminPhone: adminPhone !== undefined ? adminPhone : instance.adminPhone,
        isBotActive: finalIsBotActive,
      },
    });

    console.log(`[BotConfig] ✅ Paramètres mis à jour: isBotActive=${updatedInstance.isBotActive} (Plan: ${instance.user.subscription?.status})`);

    // Envoyer notification si le statut du bot a changé
    if (instance.isBotActive !== finalIsBotActive && instance.user.phone) {
      try {
        await SystemMessagesService.sendBotStatusChanged(instance.user.phone, instance.instanceName, finalIsBotActive);
      } catch (e) {
        console.error(`[BotConfig] Erreur envoi notification bot status:`, e);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Paramètres du bot mis à jour avec succès',
      data: {
        systemPrompt: updatedInstance.systemPrompt,
        triggerWord: updatedInstance.triggerWord,
        adminPhone: updatedInstance.adminPhone,
        isBotActive: updatedInstance.isBotActive,
      },
    });
  } catch (error: any) {
    console.error('[BotConfig] Erreur lors de la mise à jour des paramètres:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour des paramètres',
    });
  }
});

/**
 * Récupérer les paramètres du bot
 * GET /bot-config/:instanceId/settings
 */
router.get('/:instanceId/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceId } = req.params;

    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        userId,
      },
      select: {
        id: true,
        instanceName: true,
        systemPrompt: true,
        triggerWord: true,
        adminPhone: true,
        isBotActive: true,
        noContextCount: true,
        user: {
          select: {
            subscription: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance non trouvée',
      });
    }

    // Forcer isBotActive à false si l'utilisateur a le plan DIFFUSION
    const isDiffusionPlan = instance.user.subscription?.status === 'DIFFUSION';
    const finalIsBotActive = isDiffusionPlan ? false : instance.isBotActive;

    return res.status(200).json({
      success: true,
      data: {
        id: instance.id,
        instanceName: instance.instanceName,
        systemPrompt: instance.systemPrompt,
        triggerWord: instance.triggerWord,
        adminPhone: instance.adminPhone,
        isBotActive: finalIsBotActive,
        noContextCount: instance.noContextCount || 0,
      },
    });
  } catch (error: any) {
    console.error('[BotConfig] Erreur lors de la récupération des paramètres:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des paramètres',
    });
  }
});

// ==================== GESTION DE LA BASE DE CONNAISSANCES ====================

/**
 * Ajouter un document texte à la base de connaissances avec vectorisation
 * POST /bot-config/:instanceId/knowledge/text
 */
router.post('/:instanceId/knowledge/text', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceId } = req.params;
    const { name, content } = req.body;

    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'Le nom et le contenu sont requis',
      });
    }

    console.log(`[BotConfig] Ajout et vectorisation d'un document texte: ${name}`);

    // Vérifier que l'instance appartient à l'utilisateur et récupérer le plan
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        userId,
      },
      include: {
        user: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance non trouvée',
      });
    }

    // Bloquer l'ajout de documents pour les utilisateurs DIFFUSION
    const isDiffusionPlan = instance.user.subscription?.status === 'DIFFUSION';
    if (isDiffusionPlan) {
      return res.status(403).json({
        success: false,
        error: 'La base de connaissances n\'est pas disponible avec le plan DIFFUSION. Passez au plan ASSISTANT ou PREMIUM.',
      });
    }

    // Traitement et vectorisation du texte
    const result = await processTextAndStoreForBot(instanceId, content, name);

    // Récupérer le document créé pour le retourner
    const document = await prisma.knowledgeDocument.findFirst({
      where: { instanceId, name },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Document texte vectorisé et ajouté avec succès',
      data: {
        ...document,
        chunksCount: result.chunksCount,
        stats: result.stats,
      },
    });
  } catch (error: any) {
    console.error('[BotConfig] Erreur lors de l\'ajout du document texte:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'ajout du document',
    });
  }
});

/**
 * Ajouter un document PDF à la base de connaissances avec vectorisation
 * POST /bot-config/:instanceId/knowledge/pdf
 */
router.post('/:instanceId/knowledge/pdf', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez fournir un fichier PDF',
      });
    }

    console.log(`[BotConfig] Upload et vectorisation PDF: ${file.originalname} (${file.size} bytes)`);

    // Vérifier que l'instance appartient à l'utilisateur et récupérer le plan
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        userId,
      },
      include: {
        user: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance non trouvée',
      });
    }

    // Bloquer l'ajout de documents pour les utilisateurs DIFFUSION
    const isDiffusionPlan = instance.user.subscription?.status === 'DIFFUSION';
    if (isDiffusionPlan) {
      return res.status(403).json({
        success: false,
        error: 'La base de connaissances n\'est pas disponible avec le plan DIFFUSION. Passez au plan ASSISTANT ou PREMIUM.',
      });
    }

    // Traitement et vectorisation du document ou de l'image via Gemini
    const result = await processPDFAndStoreForBot(instanceId, file.buffer, file.originalname, file.mimetype);

    // Récupérer le document créé pour le retourner
    const document = await prisma.knowledgeDocument.findFirst({
      where: { instanceId, name: file.originalname },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'PDF vectorisé et ajouté avec succès',
      data: {
        ...document,
        chunksCount: result.chunksCount,
        stats: result.stats,
        warning: result.warning,
      },
    });
  } catch (error: any) {
    console.error('[BotConfig] Erreur lors de l\'upload du PDF:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'upload du PDF',
    });
  }
});

/**
 * Lister tous les documents de la base de connaissances d'une instance
 * GET /bot-config/:instanceId/knowledge
 */
router.get('/:instanceId/knowledge', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceId } = req.params;

    // Vérifier que l'instance appartient à l'utilisateur
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        userId,
      },
    });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance non trouvée',
      });
    }

    // Récupérer tous les documents
    const documents = await prisma.knowledgeDocument.findMany({
      where: { instanceId },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: {
        documents,
        count: documents.length,
      },
    });
  } catch (error: any) {
    console.error('[BotConfig] Erreur lors de la récupération des documents:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des documents',
    });
  }
});

/**
 * Supprimer un document de la base de connaissances
 * DELETE /bot-config/:instanceId/knowledge/:documentId
 */
router.delete('/:instanceId/knowledge/:documentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceId, documentId } = req.params;

    console.log(`[BotConfig] Suppression du document ${documentId}`);

    // Vérifier que l'instance appartient à l'utilisateur
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        userId,
      },
    });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance non trouvée',
      });
    }

    // Vérifier que le document existe et appartient à cette instance
    const document = await prisma.knowledgeDocument.findFirst({
      where: {
        id: documentId,
        instanceId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document non trouvé',
      });
    }

    // Supprimer le document
    await prisma.knowledgeDocument.delete({
      where: { id: documentId },
    });

    // Count remaining docs after deletion
    const remainingDocs = await prisma.knowledgeDocument.count({
      where: { instanceId },
    });

    posthogNode.capture({
      distinctId: userId,
      event: 'knowledge_document_deleted',
      properties: {
        instance_name: instance.instanceName,
        document_type: document.type.toLowerCase(),
        remaining_docs_count: remainingDocs,
        bot_was_active: instance.isBotActive,
      },
    });

    console.log(`[BotConfig] ✅ Document supprimé: ${documentId}`);

    return res.status(200).json({
      success: true,
      message: 'Document supprimé avec succès',
    });
  } catch (error: any) {
    console.error('[BotConfig] Erreur lors de la suppression du document:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du document',
    });
  }
});

// ==================== GESTION DE LA BLACKLIST ====================

/**
 * Récupérer la blacklist d'une instance
 * GET /bot-config/:instanceId/blacklist
 */
router.get('/:instanceId/blacklist', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceId } = req.params;

    const instance = await prisma.instance.findFirst({
      where: { id: instanceId, userId },
      select: { id: true, blacklist: true },
    });

    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance non trouvée' });
    }

    return res.status(200).json({
      success: true,
      data: { blacklist: instance.blacklist },
    });
  } catch (error: any) {
    console.error('[BotConfig] Erreur récupération blacklist:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la récupération de la blacklist' });
  }
});

/**
 * Mettre à jour la blacklist d'une instance
 * PUT /bot-config/:instanceId/blacklist
 */
router.put('/:instanceId/blacklist', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceId } = req.params;
    const { blacklist } = req.body;

    if (!Array.isArray(blacklist)) {
      return res.status(400).json({ success: false, error: 'Le champ blacklist doit être un tableau' });
    }

    const instance = await prisma.instance.findFirst({
      where: { id: instanceId, userId },
    });

    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance non trouvée' });
    }

    // Nettoyer et dédupliquer les numéros
    const cleanedBlacklist = [...new Set(blacklist.map((n: string) => n.replace(/[^0-9]/g, '')).filter(Boolean))];

    const updated = await prisma.instance.update({
      where: { id: instanceId },
      data: { blacklist: cleanedBlacklist },
    });

    console.log(`[BotConfig] ✅ Blacklist mise à jour pour ${instance.instanceName}: ${cleanedBlacklist.length} numéros`);

    return res.status(200).json({
      success: true,
      message: 'Blacklist mise à jour avec succès',
      data: { blacklist: updated.blacklist },
    });
  } catch (error: any) {
    console.error('[BotConfig] Erreur mise à jour blacklist:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour de la blacklist' });
  }
});

export default router;
