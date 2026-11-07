import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const router = Router();
const prisma = new PrismaClient();

const CRON_SECRET = process.env.CRON_SECRET;

const verifyCronSecret = (req: Request, res: Response, next: Function) => {
  const secret = req.headers['x-cron-secret'];
  
  if (!CRON_SECRET) {
    console.error('[Cron] CRON_SECRET non configuré');
    return res.status(500).json({ error: 'Configuration serveur invalide' });
  }

  if (secret !== CRON_SECRET) {
    console.warn('[Cron] Tentative d\'accès non autorisée');
    return res.status(401).json({ error: 'Non autorisé' });
  }

  next();
};

router.use(verifyCronSecret);

router.post('/check-subscriptions', async (req: Request, res: Response) => {
  try {
    console.log('[Cron] Vérification des abonnements expirés...');
    
    const now = new Date();

    // Ne jamais expirer les abonnements PREMIUM
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        trialEndsAt: {
          lt: now,
        },
        status: {
          in: ['DIFFUSION', 'ASSISTANT'], // PREMIUM exclus
        },
      },
    });

    let updatedCount = 0;
    for (const subscription of expiredSubscriptions) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' },
      });
      updatedCount++;
    }

    console.log(`[Cron] ${updatedCount} abonnement(s) expiré(s) mis à jour`);
    
    res.json({
      success: true,
      message: `${updatedCount} abonnement(s) expiré(s)`,
      count: updatedCount,
    });
  } catch (error: any) {
    console.error('[Cron] Erreur vérification abonnements:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/sync-instances', async (req: Request, res: Response) => {
  try {
    console.log('[Cron] Synchronisation des instances...');
    
    const instances = await prisma.instance.findMany({
      where: {
        status: {
          in: ['CONNECTED', 'CONNECTING'],
        },
      },
    });

    let syncedCount = 0;
    for (const instance of instances) {
      try {
        const response = await fetch(
          `${process.env.EVOLUTION_API_URL}/instance/connectionState/${instance.instanceName}`,
          {
            headers: {
              apikey: process.env.EVOLUTION_API_KEY || '',
            },
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const evolutionState = data.instance?.state || 'close';

          let newStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' = 'DISCONNECTED';
          if (evolutionState === 'open') {
            newStatus = 'CONNECTED';
          } else if (evolutionState === 'connecting') {
            newStatus = 'CONNECTING';
          }

          if (instance.status !== newStatus) {
            await prisma.instance.update({
              where: { id: instance.id },
              data: { status: newStatus },
            });
            syncedCount++;
          }
        }
      } catch (error) {
        console.error(`[Cron] Erreur sync instance ${instance.instanceName}:`, error);
      }
    }

    console.log(`[Cron] ${syncedCount} instance(s) synchronisée(s)`);
    
    res.json({
      success: true,
      message: `${syncedCount} instance(s) synchronisée(s)`,
      count: syncedCount,
    });
  } catch (error: any) {
    console.error('[Cron] Erreur synchronisation instances:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/cleanup-expired-trials', async (req: Request, res: Response) => {
  try {
    console.log('[Cron] Nettoyage des essais expirés...');
    
    const now = new Date();
    const result = await prisma.subscription.updateMany({
      where: {
        status: 'TRIAL',
        trialEndsAt: {
          lt: now,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    console.log(`[Cron] ${result.count} essai(s) expiré(s) mis à jour`);
    
    res.json({
      success: true,
      message: `${result.count} essai(s) expiré(s)`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('[Cron] Erreur nettoyage essais:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/health-check', async (req: Request, res: Response) => {
  try {
    console.log('[Cron] Health check...');
    
    const stats = {
      users: await prisma.user.count(),
      subscriptions: await prisma.subscription.count(),
      instances: await prisma.instance.count(),
      connectedInstances: await prisma.instance.count({
        where: { status: 'CONNECTED' },
      }),
    };

    console.log('[Cron] Stats:', stats);
    
    res.json({
      success: true,
      message: 'Backend opérationnel',
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Erreur health check:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/send-renewal-reminders', async (req: Request, res: Response) => {
  try {
    console.log('[Cron] Envoi des rappels de renouvellement...');
    
    const now = new Date();
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: {
          in: ['DIFFUSION', 'ASSISTANT', 'PREMIUM'],
        },
      },
      include: {
        user: true,
      },
    });

    let sentCount = 0;
    const { SystemMessagesService } = await import('../services/systemMessagesService');

    for (const subscription of subscriptions) {
      const daysLeft = Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if ([15, 7, 3, 1].includes(daysLeft) && subscription.user.phone) {
        try {
          let message = '';
          const planName = subscription.status;
          const expiryDate = subscription.trialEndsAt.toLocaleDateString('fr-FR');

          if (daysLeft === 15) {
            message = `👋 Bonjour ${subscription.user.firstName || 'cher utilisateur'} !\n\n` +
              `Votre abonnement *${planName}* expire dans *${daysLeft} jours* (le ${expiryDate}).\n\n` +
              `Pour continuer à profiter de NeoChat sans interruption, pensez à renouveler votre abonnement.\n\n` +
              `💳 Renouveler maintenant : https://neochat.pro/dashboard`;
          } else if (daysLeft === 7) {
            message = `⏰ Rappel important !\n\n` +
              `Votre abonnement *${planName}* expire dans *${daysLeft} jours* (le ${expiryDate}).\n\n` +
              `Ne perdez pas l'accès à vos fonctionnalités :\n` +
              `✅ Diffusion de masse\n` +
              `✅ Assistant IA intelligent\n` +
              `✅ Gestion des contacts\n\n` +
              `💳 Renouveler maintenant : https://neochat.pro/dashboard`;
          } else if (daysLeft === 3) {
            message = `🚨 URGENT - Plus que ${daysLeft} jours !\n\n` +
              `Votre abonnement *${planName}* expire le ${expiryDate}.\n\n` +
              `Après cette date, vos services seront suspendus :\n` +
              `❌ Diffusion bloquée\n` +
              `❌ Assistant IA désactivé\n` +
              `❌ Accès limité\n\n` +
              `💳 Renouvelez MAINTENANT : https://neochat.pro/dashboard`;
          } else if (daysLeft === 1) {
            message = `⚠️ DERNIÈRE CHANCE !\n\n` +
              `Votre abonnement *${planName}* expire DEMAIN (${expiryDate}).\n\n` +
              `C'est votre dernière opportunité pour renouveler sans interruption de service.\n\n` +
              `💳 Renouveler immédiatement : https://neochat.pro/dashboard\n\n` +
              `Besoin d'aide ? Répondez à ce message.`;
          }

          if (message) {
            await SystemMessagesService['sendWhatsAppMessage'](subscription.user.phone, message);
            sentCount++;
            console.log(`[Cron] Rappel J-${daysLeft} envoyé à ${subscription.user.phone}`);
          }
        } catch (error) {
          console.error(`[Cron] Erreur envoi rappel à ${subscription.user.phone}:`, error);
        }
      }
    }

    console.log(`[Cron] ${sentCount} rappel(s) de renouvellement envoyé(s)`);
    
    res.json({
      success: true,
      message: `${sentCount} rappel(s) envoyé(s)`,
      count: sentCount,
    });
  } catch (error: any) {
    console.error('[Cron] Erreur envoi rappels:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/process-scheduled-messages', async (req: Request, res: Response) => {
  try {
    console.log('[Cron] Traitement des messages programmés...');

    res.json({
      success: true,
      message: 'Fonctionnalité en développement - Les messages programmés seront traités via les campagnes',
      count: 0,
    });
  } catch (error: any) {
    console.error('[Cron] Erreur traitement messages programmés:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cron/analyze-themes
 * Analyse les questions posées au bot sur les dernières 24h et extrait les thématiques
 * Utilise OpenRouter (GPT-4o-mini) pour classifier les messages
 * Sauvegarde les résultats dans DashboardThemesDaily
 * Protégé par CRON_SECRET (via le middleware global)
 */
router.post('/analyze-themes', async (req: Request, res: Response) => {
  try {
    console.log('[Cron] 🔍 Analyse des thématiques...');

    // 1. Récupérer les messages entrants des dernières 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const messages = await prisma.messageActivity.findMany({
      where: {
        direction: 'INCOMING',
        createdAt: { gte: since },
        messageText: { not: '' },
      },
      select: { messageText: true, instanceName: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    if (messages.length === 0) {
      console.log('[Cron] Aucun message à analyser');
      return res.json({
        success: true,
        message: 'Aucun message à analyser',
        data: { totalMessages: 0, themes: [] },
      });
    }

    console.log(`[Cron] ${messages.length} messages récupérés pour analyse`);

    // 2. Construire le prompt pour OpenRouter
    const messagesText = messages
      .map(m => `[${m.instanceName}] ${m.messageText}`)
      .join('\n---\n');

    const systemPrompt = `Analyse les requêtes étudiantes suivantes et extrais les 5 thématiques principales avec leur pourcentage. Classe-les en priorité dans ces familles (Inscriptions, Tarifs, Stages, Informations Pratiques, Pédagogie, Problèmes Techniques). Renvoie UNIQUEMENT un objet JSON valide, sans markdown, sous ce format exact : {"themes": [{"theme": "Nom du thème", "pourcentage": 45}]}.`;

    // 3. Appel Gemini (avec fallback OpenRouter)
    const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENROUTER_API_KEY;
    const isGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    const BASE_URL = process.env.GEMINI_BASE_URL || (isGemini ? 'https://generativelanguage.googleapis.com/v1beta/openai' : (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'));
    const MODEL = process.env.GEMINI_MODEL || (isGemini ? 'gemini-3.1-flash-lite' : (process.env.OPENROUTER_MODEL || 'gemini-3.1-flash-lite'));
    const SITE_URL = process.env.SITE_URL || 'https://neochat.pro';
    const SITE_NAME = process.env.SITE_NAME || 'NeoChat';

    if (!API_KEY) {
      return res.status(500).json({ error: 'Clé API IA non configurée (GEMINI_API_KEY requise)' });
    }

    const aiClient = new OpenAI({
      apiKey: API_KEY,
      baseURL: BASE_URL,
      defaultHeaders: isGemini ? undefined : {
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME,
      },
    });

    // Tronquer si le texte est trop long (limite de contexte)
    const truncatedText = messagesText.length > 30000
      ? messagesText.substring(0, 30000) + '...\n[TRONQUÉ]'
      : messagesText;

    console.log(`[Cron] Appel IA (${MODEL}) avec ${truncatedText.length} caractères...`);

    const completion = await aiClient.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Voici les requêtes à analyser :\n\n${truncatedText}` },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log(`[Cron] Réponse IA reçue: ${responseText.substring(0, 200)}...`);

    // 4. Parser la réponse JSON
    let themes: Array<{ theme: string; pourcentage: number }> = [];
    try {
      // Nettoyer la réponse (enlever les éventuels ```json ... ```)
      const cleaned = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      themes = parsed.themes || [];
    } catch (parseError) {
      console.error('[Cron] Erreur parsing JSON OpenRouter:', parseError);
      console.error('[Cron] Réponse brute:', responseText);
      return res.status(500).json({ error: 'Erreur parsing réponse OpenRouter', raw: responseText });
    }

    // 5. Sauvegarder dans DashboardThemesDaily
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Upsert : mettre à jour si une entrée existe déjà pour aujourd'hui
    const saved = await prisma.dashboardThemesDaily.upsert({
      where: { date: today },
      update: {
        themes: themes,
        messageCount: messages.length,
      },
      create: {
        date: today,
        themes: themes,
        messageCount: messages.length,
      },
    });

    console.log(`[Cron] ✅ ${themes.length} thématiques sauvegardées pour ${today.toISOString().split('T')[0]}`);

    res.json({
      success: true,
      message: 'Analyse thématique terminée',
      data: {
        date: today.toISOString().split('T')[0],
        totalMessages: messages.length,
        themes,
        id: saved.id,
      },
    });
  } catch (error: any) {
    console.error('[Cron] Erreur analyse thématiques:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cron/one-shot-users
 * Identifie les utilisateurs "one-shot" : ceux qui ont envoyé 1 seul message
 * sur les 7 derniers jours et n'ont pas recréé de session depuis.
 * Tracke l'événement one_shot_user dans PostHog.
 * Protégé par CRON_SECRET (via le middleware global).
 */
router.post('/one-shot-users', async (req: Request, res: Response) => {
  try {
    console.log('[Cron] 🔍 Analyse des utilisateurs one-shot...');

    // 1. Récupérer les messages entrants des 7 derniers jours
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Trouver les utilisateurs qui ont exactement 1 message entrant sur la période
    const oneShotUsers = await prisma.messageActivity.groupBy({
      by: ['senderPhone', 'instanceName'],
      where: {
        direction: 'INCOMING',
        createdAt: { gte: sevenDaysAgo },
        senderPhone: { not: null },
      },
      _count: { id: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    });

    console.log(`[Cron] ${oneShotUsers.length} utilisateur(s) potentiel(s) one-shot trouvé(s)`);

    // Filtrer : garder uniquement ceux avec 1 seul message
    const oneShotCandidates = oneShotUsers.filter((u) => u._count.id === 1);

    if (oneShotCandidates.length === 0) {
      console.log('[Cron] Aucun utilisateur one-shot détecté');
      return res.json({
        success: true,
        message: 'Aucun utilisateur one-shot détecté',
        count: 0,
      });
    }

    // 2. Pour chaque candidat, vérifier s'il y a eu une session ultérieure
    // et tracker l'événement
    let trackedCount = 0;
    const { trackOneShotUser, hashPhone } = await import('../lib/analytics');

    for (const candidate of oneShotCandidates) {
      try {
        const senderPhone = candidate.senderPhone!;
        const instanceName = candidate.instanceName;
        const messageDate = candidate._min?.createdAt;
        if (!messageDate) continue;

        const daysSinceMessage = Math.floor(
          (Date.now() - messageDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Récupérer le message pour voir sa longueur
        const messageActivity = await prisma.messageActivity.findFirst({
          where: {
            senderPhone,
            instanceName,
            direction: 'INCOMING',
            createdAt: { gte: messageDate },
          },
          orderBy: { createdAt: 'desc' },
          select: { messageText: true, id: true },
        });

        if (!messageActivity) continue;

        // Vérifier si la réponse du bot était un fallback
        const botResponse = await prisma.messageActivity.findFirst({
          where: {
            instanceName,
            direction: 'OUTGOING',
            // Chercher une réponse juste après le message de l'utilisateur
            createdAt: {
              gte: messageDate,
              lte: new Date(messageDate.getTime() + 60 * 1000), // dans la minute
            },
          },
          orderBy: { createdAt: 'asc' },
          select: { messageText: true, wasAnswered: true },
        });

        const botResponseWasFallback =
          !botResponse?.wasAnswered ||
          (botResponse?.messageText?.toLowerCase().includes("pas d'information") ||
            botResponse?.messageText?.toLowerCase().includes('je ne sais pas') ||
            botResponse?.messageText?.toLowerCase().includes('administrateur') ||
            botResponse?.messageText?.toLowerCase().includes('notifié') ||
            botResponse?.messageText?.toLowerCase().includes('aucune base de connaissances') ||
            false);

        // Tracker l'événement
        await trackOneShotUser(
          senderPhone,
          instanceName,
          daysSinceMessage,
          messageActivity.messageText.length,
          botResponseWasFallback,
        );

        trackedCount++;
        console.log(
          `[Cron] 📊 One-shot tracké: ${hashPhone(senderPhone).substring(0, 12)}... (${daysSinceMessage} jour(s))`,
        );
      } catch (candidateError) {
        console.error(`[Cron] ⚠️ Erreur traitement candidat one-shot:`, candidateError);
      }
    }

    console.log(`[Cron] ✅ ${trackedCount}/${oneShotCandidates.length} utilisateur(s) one-shot tracké(s)`);

    res.json({
      success: true,
      message: `${trackedCount} utilisateur(s) one-shot tracké(s)`,
      count: trackedCount,
      total: oneShotCandidates.length,
    });
  } catch (error: any) {
    console.error('[Cron] Erreur analyse one-shot:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
