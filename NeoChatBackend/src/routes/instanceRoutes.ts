import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { checkSubscriptionStatus } from '../middleware/subscriptionMiddleware';
import { createEvolutionInstance, getQRCode, deleteEvolutionInstance, getInstanceStatus, getPairingCode, hardDeleteInstance } from '../services/evolutionInstanceService';
import SystemMessagesService from '../services/systemMessagesService';

const router = Router();

router.post('/create', authenticate, checkSubscriptionStatus, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceName, phoneNumber } = req.body;

    if (!instanceName) {
      return res.status(400).json({
        success: false,
        error: 'Le nom de l\'instance est requis',
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Le numéro de téléphone est requis pour créer une instance',
      });
    }

    // Formater le nom pour Evolution API (remplacer espaces par underscores)
    const formattedInstanceName = instanceName.trim().replace(/\s+/g, '_');

    console.log(`[Instance] Demande de création pour l'utilisateur ${userId}`);
    console.log(`[Instance] Nom original: "${instanceName}" → Formaté: "${formattedInstanceName}"`);
    console.log(`[Instance] Numéro: ${phoneNumber}`);
    console.log(`[Instance] Mode: Pairing Code (par défaut)`);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        subscription: true,
        instances: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    if (!user.subscription) {
      return res.status(403).json({
        success: false,
        error: 'Aucun abonnement actif',
      });
    }

    if (user.subscription.status === 'EXPIRED') {
      return res.status(403).json({
        success: false,
        error: 'Abonnement expiré. Veuillez renouveler votre abonnement.',
      });
    }

    // Vérifier qu'il n'y a pas déjà une instance pour cet utilisateur
    if (user.instances.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Vous avez déjà une instance WhatsApp. Veuillez la supprimer avant d\'en créer une nouvelle.',
      });
    }

    const existingInstance = await prisma.instance.findFirst({
      where: {
        userId,
        instanceName: formattedInstanceName,
      },
    });

    if (existingInstance) {
      return res.status(409).json({
        success: false,
        error: 'Une instance avec ce nom existe déjà',
      });
    }

    let instanceStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' = 'DISCONNECTED';
    let pairingCode: string | null = null;

    try {
      // Créer l'instance Evolution en mode Pairing Code
      await createEvolutionInstance(formattedInstanceName, true, phoneNumber);
      instanceStatus = 'CONNECTING';
      console.log(`[Instance] Instance Evolution créée en mode Pairing Code: ${formattedInstanceName}`);
      
      // IMPORTANT: Générer le Pairing Code IMMÉDIATEMENT pour éviter que le QR Code soit généré
      console.log(`[Instance] 🔑 Génération automatique du Pairing Code...`);
      
      // Attendre 2 secondes pour que l'instance soit prête
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const pairingCodeData = await getPairingCode(formattedInstanceName, phoneNumber);
        pairingCode = pairingCodeData.code;
        console.log(`[Instance] ✅ Pairing Code généré automatiquement: ${pairingCode}`);
      } catch (pairingError: any) {
        console.error(`[Instance] ⚠️ Impossible de générer le Pairing Code automatiquement:`, pairingError.message);
        // On continue quand même, l'utilisateur pourra le demander manuellement
      }
    } catch (evolutionError: any) {
      console.error(`[Instance] Evolution API non disponible:`, evolutionError.message);
      instanceStatus = 'DISCONNECTED';
    }

    // Bot toujours OFF par défaut — l'utilisateur l'activera manuellement après avoir configuré sa base de connaissances
    const instance = await prisma.instance.create({
      data: {
        userId,
        instanceName: formattedInstanceName,
        status: instanceStatus,
        pairingCode: pairingCode,
        isBotActive: false,
      },
    });

    console.log(`[Instance] ✅ Instance créée en base: ${instance.id}`);

    return res.status(201).json({
      success: true,
      message: pairingCode 
        ? 'Instance créée avec succès. Code de jumelage généré automatiquement.'
        : 'Instance créée avec succès',
      data: {
        instance: {
          id: instance.id,
          instanceName: instance.instanceName,
          status: instance.status,
          pairingCode: pairingCode,
          createdAt: instance.createdAt,
        },
      },
    });
  } catch (error: any) {
    console.error('[Instance] Erreur lors de la création de l\'instance:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue lors de la création de l\'instance',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});


router.get('/list', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const instances = await prisma.instance.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: {
        instances: instances.map(instance => ({
          id: instance.id,
          instanceName: instance.instanceName,
          status: instance.status,
          difyAppId: instance.difyAppId,
          createdAt: instance.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('[Instance] Erreur lors de la récupération des instances:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.delete('/:instanceName', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceName } = req.params;

    console.log(`[Instance] 🗑️ Demande de suppression complète: ${instanceName} par utilisateur ${userId}`);

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

    // Utiliser hardDeleteInstance pour une suppression complète (Evolution API + Prisma)
    try {
      await hardDeleteInstance(instanceName);
      console.log(`[Instance] ✅ Suppression complète réussie: ${instanceName}`);
    } catch (deleteError: any) {
      console.error(`[Instance] ❌ Erreur lors de la suppression complète:`, deleteError.message);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression de l\'instance',
        details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Instance supprimée complètement avec succès',
    });
  } catch (error: any) {
    console.error('[Instance] Erreur lors de la suppression de l\'instance:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.get('/status/:instanceName', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceName } = req.params;

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

    let currentStatus = instance.status;
    let qrCode: string | null = null;

    // Si l'instance n'est pas connectée, vérifier le statut via Evolution API
    if (instance.status !== 'CONNECTED') {
      try {
        console.log(`[Instance] Vérification du statut pour: ${instanceName}`);
        
        // Vérifier le statut de connexion
        const status = await getInstanceStatus(instanceName);
        const connectionState = status.instance?.state;

        console.log(`[Instance] État Evolution API: ${connectionState}`);

        if (connectionState === 'open') {
          currentStatus = 'CONNECTED';
          console.log(`[Instance] ✅ Instance connectée: ${instanceName}`);
          
          // Mettre à jour le statut en base
          await prisma.instance.update({
            where: { id: instance.id },
            data: { status: 'CONNECTED' },
          });

          // Envoyer notification de connexion
          try {
            const user = await prisma.user.findUnique({
              where: { id: instance.userId },
            });
            if (user?.phone) {
              await SystemMessagesService.sendInstanceConnected(user.phone, instanceName);
              console.log(`[Instance] 📱 Notification de connexion envoyée à ${user.phone}`);
            }
          } catch (notifError) {
            console.error(`[Instance] Erreur lors de l'envoi de la notification:`, notifError);
          }
        } else {
          currentStatus = 'CONNECTING';
          
          // Récupérer le QR code pour les utilisateurs qui choisissent cette option
          qrCode = await getQRCode(instanceName);
          if (qrCode) {
            console.log(`[Instance] ✅ QR code récupéré pour: ${instanceName}`);
          }
        }
      } catch (error: any) {
        console.error(`[Instance] Erreur lors de la vérification du statut:`, error.message);
      }
    }

    // Retourner l'instance avec le QR code si disponible
    return res.status(200).json({
      success: true,
      data: {
        id: instance.id,
        instanceName: instance.instanceName,
        status: currentStatus,
        qrCode: qrCode,
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[Instance] Erreur lors de la récupération du statut:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.post('/pairing-code', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceName, phoneNumber } = req.body;

    if (!instanceName || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Le nom de l\'instance et le numéro de téléphone sont requis',
      });
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

    if (instance.status === 'CONNECTED') {
      return res.status(400).json({
        success: false,
        error: 'Instance déjà connectée',
      });
    }

    try {
      const pairingCodeData = await getPairingCode(instanceName, phoneNumber);
      
      console.log(`[Instance] ✅ Code de jumelage généré pour ${instanceName}: ${pairingCodeData.code}`);

      return res.status(200).json({
        success: true,
        data: {
          code: pairingCodeData.code,
          instanceName: pairingCodeData.instanceName,
        },
      });
    } catch (evolutionError: any) {
      console.error(`[Instance] Erreur Evolution lors de la génération du code:`, evolutionError.message);
      return res.status(500).json({
        success: false,
        error: 'Impossible de générer le code de jumelage',
        details: process.env.NODE_ENV === 'development' ? evolutionError.message : undefined,
      });
    }
  } catch (error: any) {
    console.error('[Instance] Erreur lors de la génération du code de jumelage:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/instances/stats/:instanceName
 * Endpoint public pour récupérer les statistiques d'une instance spécifique
 * Utilisé par les dashboards publics des universités/institutions
 */
router.get('/stats/:instanceName', async (req: AuthRequest, res: Response) => {
  try {
    const { instanceName } = req.params;

    console.log(`[Instance Stats] Récupération des stats pour: ${instanceName}`);

    // Trouver l'instance par son nom
    const instance = await prisma.instance.findFirst({
      where: { instanceName },
      include: {
        user: {
          include: { subscription: true },
        },
        knowledgeDocs: true,
      },
    });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance non trouvée',
      });
    }

    const subscription = instance.user.subscription;

    // Compter les MESSAGES RÉELS traités dans la table messageActivity (pas le compteur d'abonnement)
    // Le subscription.messageCount ne reflète que les messages facturés/billables,
    // on utilise le vrai comptage pour les dashboards publics
    const actualMessageCount = await prisma.messageActivity.count({
      where: { instanceName }
    });
    const messageCount = actualMessageCount || 0;

    // Compter les utilisateurs uniques (numéros distincts) ayant interagi avec l'agent
    const uniqueUsers = await prisma.messageActivity.groupBy({
      by: ['senderPhone'],
      where: {
        instanceName,
        senderPhone: { not: null },
      },
      _count: true,
    });
    const uniqueUserCount = uniqueUsers.length;

    // Calcul du temps économisé: 1 question = 3 minutes au guichet
    const minutesPerQuestion = 3;
    const totalMinutesSaved = messageCount * minutesPerQuestion;
    const hoursSaved = Math.round((totalMinutesSaved / 60) * 100) / 100;
    const daysSaved = Math.round((hoursSaved / 8) * 100) / 100;

    // Estimation des conversations (approximatif: moyenne de 5 messages par conversation)
    const avgMessagesPerConversation = 5;
    const estimatedConversations = Math.ceil(messageCount / avgMessagesPerConversation);

    // Nombre de messages sans réponse (basé sur le champ wasAnswered de messageActivity)
    const noAnswerCount = await prisma.messageActivity.count({
      where: {
        instanceName,
        wasAnswered: false,
      }
    });

    // Taux de réponses automatiques (messages qui ont reçu une réponse)
    const autoReplyRate = messageCount > 0
      ? Math.round(((messageCount - noAnswerCount) / messageCount) * 100)
      : 0;

    console.log(`[Instance Stats] ✅ Stats pour ${instanceName}: ${messageCount} messages, ${estimatedConversations} conversations estimées`);

    return res.status(200).json({
      success: true,
      data: {
        instance: {
          id: instance.id,
          instanceName: instance.instanceName,
          status: instance.status,
          isBotActive: instance.isBotActive,
          createdAt: instance.createdAt,
          firstBotMessageAt: instance.firstBotMessageAt,
        },
        stats: {
          totalMessages: messageCount,
          uniqueUsers: uniqueUserCount,
          estimatedConversations: estimatedConversations,
          totalMinutesSaved: totalMinutesSaved,
          totalHoursSaved: hoursSaved,
          totalDaysSaved: daysSaved,
          noAnswerCount: noAnswerCount,
          autoReplyRate: autoReplyRate,
          knowledgeDocsCount: instance.knowledgeDocs.length,
        },
        config: {
          minutesPerQuestion: minutesPerQuestion,
          avgMessagesPerConversation: avgMessagesPerConversation,
        },
      },
    });
  } catch (error: any) {
    console.error('[Instance Stats] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue lors de la récupération des statistiques',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/instances/activity/:instanceName
 * Endpoint public pour récupérer l'activité par plage horaire d'une instance
 * Query params: date (YYYY-MM-DD, optionnel), direction (INCOMING|OUTGOING, optionnel)
 */
router.get('/activity/:instanceName', async (req: AuthRequest, res: Response) => {
  try {
    const { instanceName } = req.params;
    const { date, direction } = req.query;

    console.log(`[Instance Activity] Récupération de l'activité pour: ${instanceName}`);

    // Trouver l'instance
    const instance = await prisma.instance.findFirst({
      where: { instanceName },
    });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance non trouvée',
      });
    }

    // Filtrer par date si spécifiée
    const dateFilter: any = {};
    if (date && typeof date === 'string') {
      const startDate = new Date(date + 'T00:00:00.000Z');
      const endDate = new Date(date + 'T23:59:59.999Z');
      dateFilter.createdAt = { gte: startDate, lte: endDate };
    }

    // Filtrer par direction si spécifiée
    const directionFilter: any = {};
    if (direction && typeof direction === 'string' && ['INCOMING', 'OUTGOING'].includes(direction)) {
      directionFilter.direction = direction;
    }

    // Récupérer les messages
    const messages = await prisma.messageActivity.findMany({
      where: {
        instanceName,
        ...dateFilter,
        ...directionFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // Agréger par plage horaire (0-23h)
    const hourlyActivity: { [key: number]: { total: number; incoming: number; outgoing: number } } = {};
    for (let h = 0; h < 24; h++) {
      hourlyActivity[h] = { total: 0, incoming: 0, outgoing: 0 };
    }

    for (const msg of messages) {
      const hour = new Date(msg.createdAt).getUTCHours();
      // Ajuster au fuseau horaire GMT (UTC+0)
      const localHour = hour;
      if (!hourlyActivity[localHour]) {
        hourlyActivity[localHour] = { total: 0, incoming: 0, outgoing: 0 };
      }
      hourlyActivity[localHour].total++;
      if (msg.direction === 'INCOMING') {
        hourlyActivity[localHour].incoming++;
      } else {
        hourlyActivity[localHour].outgoing++;
      }
    }

    // Convertir en tableau pour le frontend
    const hourlyArray = Object.entries(hourlyActivity).map(([hour, count]) => ({
      hour: parseInt(hour),
      label: `${hour.toString().padStart(2, '0')}:00`,
      ...count,
    }));

    // Statistiques globales
    const totalMessages = messages.length;
    const totalIncoming = messages.filter(m => m.direction === 'INCOMING').length;
    const totalOutgoing = messages.filter(m => m.direction === 'OUTGOING').length;

    // Période d'activité
    const dates = messages.map(m => m.createdAt.getTime());
    const periodStart = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const periodEnd = dates.length > 0 ? new Date(Math.max(...dates)) : null;

    // Top heures d'activité
    const sortedHours = [...hourlyArray].sort((a, b) => b.total - a.total);
    const peakHours = sortedHours.slice(0, 3).filter(h => h.total > 0);

    console.log(`[Instance Activity] ✅ ${totalMessages} activités trouvées pour ${instanceName}`);

    return res.status(200).json({
      success: true,
      data: {
        instanceName: instance.instanceName,
        filters: {
          date: date || null,
          direction: direction || null,
        },
        summary: {
          totalMessages,
          totalIncoming,
          totalOutgoing,
          periodStart,
          periodEnd,
          peakHours,
        },
        hourlyActivity: hourlyArray,
        recentMessages: messages.slice(0, 50).map(m => ({
          id: m.id,
          direction: m.direction,
          senderPhone: m.senderPhone,
          messageText: m.messageText.substring(0, 200),
          isGroupMessage: m.isGroupMessage,
          wasAnswered: m.wasAnswered,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('[Instance Activity] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue lors de la récupération de l\'activité',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/instances/themes/:instanceName
 * Endpoint public pour récupérer les dernières thématiques analysées
 */
router.get('/themes/:instanceName', async (req: AuthRequest, res: Response) => {
  try {
    const { instanceName } = req.params;

    const instance = await prisma.instance.findFirst({
      where: { instanceName },
    });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance non trouvée',
      });
    }

    // Récupérer la dernière analyse thématique
    const latestThemes = await prisma.dashboardThemesDaily.findFirst({
      orderBy: { date: 'desc' },
    });

    if (!latestThemes) {
      return res.status(200).json({
        success: true,
        data: {
          date: null,
          themes: [],
          messageCount: 0,
          message: 'Aucune analyse disponible. Le cron job d\'analyse n\'a pas encore été exécuté.',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: latestThemes.id,
        date: latestThemes.date,
        themes: latestThemes.themes,
        messageCount: latestThemes.messageCount,
        updatedAt: latestThemes.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[Instance Themes] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue lors de la récupération des thématiques',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
