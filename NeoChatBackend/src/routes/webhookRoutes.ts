import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendMessageToDify } from '../services/difyService';
import { processRAGQuery } from '../services/aiService';
import { messageQueue } from '../queues/messageQueue';
import SystemMessagesService from '../services/systemMessagesService';
import {
  posthogNode,
  trackMessageSent,
  trackNewUserFirstMessage,
  trackUserReturned,
  trackKnowledgeBaseHit,
  trackKnowledgeBaseMiss,
  trackFallbackTriggered,
  trackQuestionRepeated,
  trackBotResponse,
  getActiveSession,
  detectRepeatedQuestion,
  cacheQuestion,
  hashPhone,
} from '../lib/analytics';

const router = Router();

interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
    };
    messageTimestamp: number;
    pushName?: string;
  };
}

router.post('/evolution', async (req: Request, res: Response) => {
  try {
    const payload: any = req.body;

    console.log(`[Webhook] Événement reçu: ${payload.event} pour instance ${payload.instance}`);
    console.log(`[Webhook] Payload complet:`, JSON.stringify(payload, null, 2));

    // Gérer l'événement de connexion d'instance
    if (payload.event === 'connection.update') {
      console.log(`[Webhook] 🔌 Événement de connexion détecté`);
      
      const instanceName = payload.instance;
      const connectionState = payload.data?.state;

      // Fetch current state in DB before any update
      const previousInstance = await prisma.instance.findFirst({
        where: { instanceName },
        include: { user: true },
      });
      
      if (connectionState === 'open') {
        console.log(`[Webhook] ✅ Instance connectée: ${instanceName}`);
        const wasAlreadyConnected = previousInstance?.status === 'CONNECTED';
        
        // Mettre à jour le statut en base
        await prisma.instance.updateMany({
          where: { instanceName },
          data: { 
            status: 'CONNECTED',
            updatedAt: new Date(),
          },
        });

        // Track instance_reconnected if it was previously disconnected
        if (previousInstance?.status === 'DISCONNECTED' && previousInstance?.user) {
          const downtimeMinutes = Math.round((Date.now() - previousInstance.updatedAt.getTime()) / 60000);
          posthogNode.capture({
            distinctId: previousInstance.user.id,
            event: 'instance_reconnected',
            properties: {
              instance_name: instanceName,
              was_disconnected_by_provider: true,
              downtime_minutes: downtimeMinutes,
              reconnection_method: 'webhook',
            },
          });
        }
        
        // Envoyer notification de connexion SEULEMENT si le statut a changé
        if (!wasAlreadyConnected) {
          try {
            const instanceData = previousInstance || await prisma.instance.findFirst({
              where: { instanceName },
              include: { user: true },
            });
            
            if (instanceData?.user?.phone) {
              await SystemMessagesService.sendInstanceConnected(instanceData.user.phone, instanceName);
              console.log(`[Webhook] 📱 Notification de connexion envoyée à ${instanceData.user.phone}`);
            }
          } catch (notifError) {
            console.error(`[Webhook] Erreur lors de l'envoi de la notification:`, notifError);
          }
        } else {
          console.log(`[Webhook] ℹ️ L'instance ${instanceName} est déjà marquée comme CONNECTED, notification ignorée.`);
        }
      } else if (connectionState === 'close') {
        console.log(`[Webhook] ❌ Instance déconnectée: ${instanceName}`);
        const wasAlreadyDisconnected = previousInstance?.status === 'DISCONNECTED';
        
        // Mettre à jour le statut en base
        await prisma.instance.updateMany({
          where: { instanceName },
          data: { 
            status: 'DISCONNECTED',
            updatedAt: new Date(),
          },
        });
        
        // Envoyer notification de déconnexion SEULEMENT si le statut a changé
        if (!wasAlreadyDisconnected) {
          try {
            const instanceData = previousInstance || await prisma.instance.findFirst({
              where: { instanceName },
              include: { user: true },
            });
            
            if (instanceData?.user) {
              const timeSinceConnectionMinutes = previousInstance?.updatedAt 
                ? Math.round((Date.now() - previousInstance.updatedAt.getTime()) / 60000)
                : 0;
                
              posthogNode.capture({
                distinctId: instanceData.user.id,
                event: 'instance_disconnected_by_provider',
                properties: {
                  instance_name: instanceName,
                  reason_code: payload.data?.statusCode || 'connection_closed',
                  time_since_connection_minutes: timeSinceConnectionMinutes,
                },
              });

              if (instanceData.user.phone) {
                await SystemMessagesService.sendInstanceDisconnected(instanceData.user.phone, instanceName);
                console.log(`[Webhook] 📱 Notification de déconnexion envoyée à ${instanceData.user.phone}`);
              }
            }
          } catch (notifError) {
            console.error(`[Webhook] Erreur lors de l'envoi de la notification:`, notifError);
          }
        } else {
          console.log(`[Webhook] ℹ️ L'instance ${instanceName} est déjà marquée comme DISCONNECTED, notification ignorée.`);
        }
      }
      
      return res.status(200).json({ success: true, message: 'Statut de connexion traité' });
    }

    // Gérer l'événement qrcode.updated pour le pairing code
    if (payload.event === 'qrcode.updated') {
      console.log(`[Webhook] 🔑 Événement QR Code/Pairing Code détecté`);
      
      const instanceName = payload.instance;
      const pairingCode = payload.data?.pairingCode || payload.data?.code;
      
      if (pairingCode) {
        console.log(`[Webhook] ✅ Pairing Code reçu: ${pairingCode}`);
        
        // Mettre à jour l'instance en base avec le pairing code
        await prisma.instance.updateMany({
          where: { instanceName },
          data: { 
            pairingCode,
            updatedAt: new Date(),
          },
        });
        
        console.log(`[Webhook] ✅ Pairing Code stocké en base pour ${instanceName}`);
      }
      
      return res.status(200).json({ success: true, message: 'Pairing code traité' });
    }

    if (payload.event !== 'messages.upsert') {
      return res.status(200).json({ success: true, message: 'Événement ignoré' });
    }
    
    const typedPayload: EvolutionWebhookPayload = payload;

    // Gestion des messages de groupe et individuels
    const remoteJid = payload.data.key.remoteJid;
    const isGroup = remoteJid.endsWith('@g.us');
    const instanceName = payload.instance;
    const senderPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    
    // Extraction du texte du message (supporte plusieurs types pour Evolution API v2)
    const message = payload.data?.message;
    console.log(`[Webhook] Debug Message Structure:`, JSON.stringify(message, null, 2));

    const messageText = message?.conversation || 
                        message?.extendedTextMessage?.text || 
                        message?.imageMessage?.caption ||
                        message?.videoMessage?.caption ||
                        message?.documentMessage?.caption ||
                        message?.buttonsResponseMessage?.selectedButtonId ||
                        message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                        '';

    console.log(`[Webhook] Message texte extrait: "${messageText}"`);

    if (!messageText) {
      console.log(`[Webhook] Message vide, ignoré`);
      return res.status(200).json({ success: true, message: 'Message vide ignoré' });
    }

    const instance = await prisma.instance.findFirst({
      where: { instanceName },
      include: {
        user: {
          include: { subscription: true },
        },
        knowledgeDocs: true,
        botGroups: true,
      },
    });

    if (!instance) {
      console.log(`[Webhook] Instance non trouvée: ${instanceName}`);
      return res.status(404).json({ success: false, error: 'Instance non trouvée' });
    }

    // ===== FILTRAGE DES GROUPES =====
    if (isGroup) {
      const groupConfig = instance.botGroups.find(g => g.whatsappGroupId === remoteJid);
      if (!groupConfig || !groupConfig.isActive) {
        console.log(`[Webhook] 👥 Message de groupe ignoré (non autorisé): ${remoteJid}`);
        return res.status(200).json({ success: true, message: 'Groupe non autorisé' });
      }
      console.log(`[Webhook] 👥 Message de groupe autorisé: ${remoteJid}`);
    }

    const subscription = instance.user.subscription;

    // ===== CHECK BLACKLIST (uniquement pour messages individuels) =====
    if (!isGroup && instance.blacklist && instance.blacklist.includes(senderPhone)) {
      console.log(`[Webhook] 🚫 Numéro blacklisté: ${senderPhone} (instance: ${instanceName})`);
      return res.status(200).json({ success: true, message: 'Numéro blacklisté, message ignoré' });
    }

    // ===== CHECK DIFFUSION EN PREMIER (priorité absolue) =====
    if (subscription?.status === 'DIFFUSION') {
      console.log(`[Webhook] 🚫 Plan DIFFUSION détecté - Bot BLOQUÉ pour l'utilisateur ${instance.userId} (instance: ${instanceName})`);
      
      // Forcer isBotActive à false en BDD si ce n'est pas déjà fait
      if (instance.isBotActive) {
        await prisma.instance.update({
          where: { id: instance.id },
          data: { isBotActive: false },
        });
        console.log(`[Webhook] 🔧 isBotActive forcé à false en BDD pour instance ${instanceName}`);
      }
      
      return res.status(200).json({ success: true, message: 'Bot non disponible avec le plan DIFFUSION' });
    }

    // Vérifier si le bot est actif
    if (!instance.isBotActive) {
      console.log(`[Webhook] Bot en pause pour l'instance ${instanceName}`);
      return res.status(200).json({ success: true, message: 'Bot en pause, message ignoré' });
    }

    if (!subscription) {
      console.log(`[Webhook] Aucun abonnement pour l'utilisateur ${instance.userId}`);
      return res.status(403).json({ success: false, error: 'Aucun abonnement actif' });
    }

    if (subscription.status === 'EXPIRED') {
      console.log(`[Webhook] Abonnement expiré pour l'utilisateur ${instance.userId}`);
      
      if (!isGroup) {
        await messageQueue.add('send-message', {
          instanceName,
          recipientPhone: senderPhone,
          message: '⚠️ Votre abonnement NeoChat a expiré. Veuillez renouveler pour continuer à utiliser le service.',
          userId: instance.userId,
        });
      }

      return res.status(200).json({ success: true, message: 'Abonnement expiré, message envoyé' });
    }

    // ===== SLIDING WINDOW : Récupérer l'historique AVANT d'insérer le nouveau message =====
    // On SELECT l'historique d'abord pour qu'il ne contienne PAS le message courant
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    try {
      const recentMessages = await prisma.messageActivity.findMany({
        where: {
          instanceId: instance.id,
          senderPhone: senderPhone,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          direction: true,
          messageText: true,
        },
      });

      // Remettre dans l'ordre chronologique (du plus ancien au plus récent)
      recentMessages.reverse();

      // Mapper au format { role, content } pour l'API LLM
      conversationHistory = recentMessages
        .filter(msg => msg.messageText && msg.messageText.trim().length > 0)
        .map(msg => ({
          role: (msg.direction === 'INCOMING' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: msg.messageText,
        }));

      console.log(`[Webhook] 💬 Fenêtre glissante : ${conversationHistory.length} messages d'historique chargés pour ${senderPhone}`);
    } catch (historyError) {
      // Résilience : si la requête échoue (nouvel utilisateur, erreur DB), on continue avec un historique vide
      console.error(`[Webhook] ⚠️ Erreur récupération historique:`, historyError);
      conversationHistory = [];
    }

    // ===== LOGGER L'ACTIVITÉ DU MESSAGE ENTRANT (INSERT après le SELECT) =====
    try {
      await prisma.messageActivity.create({
        data: {
          instanceId: instance.id,
          instanceName: instance.instanceName,
          direction: 'INCOMING',
          senderPhone: senderPhone,
          messageText: messageText.substring(0, 500),
          isGroupMessage: isGroup,
          groupId: isGroup ? remoteJid : null,
          wasAnswered: false,
        },
      });
    } catch (logError) {
      console.error(`[Webhook] ⚠️ Erreur lors du logging du message entrant:`, logError);
    }

    // ===== TRACKING ANALYTICS (PostHog) =====
    try {
      const source: 'qr_code' | 'direct_link' | 'referral' | 'unknown' = 'unknown';

      // 1. message_sent (tous les messages)
      const { sessionId } = await trackMessageSent(senderPhone, instanceName, source);

      // 2. new_user_first_message : vérifier si c'est le premier message de cet utilisateur
      const previousMessagesCount = await prisma.messageActivity.count({
        where: {
          instanceId: instance.id,
          senderPhone: senderPhone,
          direction: 'INCOMING',
        },
      });

      if (previousMessagesCount === 1) {
        // C'est le tout premier message de cet utilisateur
        await trackNewUserFirstMessage(senderPhone, instanceName, source);
        console.log(`[Analytics] 🆕 Nouvel utilisateur détecté: ${hashPhone(senderPhone).substring(0, 12)}...`);
      }

      // 3. user_returned : vérifier si l'utilisateur revient après >= 1 jour
      if (previousMessagesCount > 1) {
        const lastMessage = await prisma.messageActivity.findFirst({
          where: {
            instanceId: instance.id,
            senderPhone: senderPhone,
            direction: 'INCOMING',
          },
          orderBy: { createdAt: 'desc' },
          skip: 1, // Ignorer le message actuel, prendre le précédent
          select: { createdAt: true },
        });

        if (lastMessage) {
          const now = new Date();
          const diffMs = now.getTime() - lastMessage.createdAt.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          if (diffDays >= 1) {
            // Compter le nombre total de sessions pour cet utilisateur
            const totalSessions = await prisma.messageActivity.count({
              where: {
                instanceId: instance.id,
                senderPhone: senderPhone,
                direction: 'INCOMING',
              },
            });

            await trackUserReturned(senderPhone, instanceName, diffDays, totalSessions);
            console.log(`[Analytics] 🔄 Retour utilisateur après ${diffDays} jour(s) pour ${hashPhone(senderPhone).substring(0, 12)}...`);
          }
        }
      }

      // 7. question_repeated : détecter si la question est similaire à une précédente
      try {
        const repeated = detectRepeatedQuestion(senderPhone, instanceName, messageText);
        if (repeated) {
          await trackQuestionRepeated(
            senderPhone,
            instanceName,
            sessionId,
            repeated.originalSessionId,
            repeated.daysSinceOriginal,
            repeated.similarityScore,
          );
          console.log(
            `[Analytics] 🔁 Question répétée détectée (sim: ${repeated.similarityScore.toFixed(2)}) pour ${hashPhone(senderPhone).substring(0, 12)}...`,
          );
        }
      } catch (_) {
        // Échec silencieux pour la détection de répétition
      }

      // Mettre en cache la question pour les détections futures
      cacheQuestion(senderPhone, instanceName, messageText, sessionId);
    } catch (analyticsError) {
      console.error(`[Analytics] ⚠️ Erreur tracking utilisateur:`, analyticsError);
    }

    // Pipeline RAG : Recherche vectorielle + Génération de réponse
    try {
      console.log(`[Webhook] Traitement RAG pour instance ${instance.id} (Group: ${isGroup})`);



      // Vérifier si l'IA doit se déclencher dans un groupe
      let shouldTrigger = !isGroup; // Toujours déclencher pour les messages privés
      
      const botName = instance.instanceName.toLowerCase();
      const triggerWord = instance.triggerWord?.toLowerCase();
      const isMentioned = messageText.toLowerCase().includes('@neochat') || 
                          messageText.toLowerCase().includes(`@${botName}`) ||
                          (triggerWord && messageText.toLowerCase().includes(`@${triggerWord}`));

      if (isGroup && isMentioned) {
        shouldTrigger = true;
        console.log(`[Webhook] 🤖 Bot mentionné dans le groupe, déclenchement forcé`);
      }

      // Vérifier si l'instance a des KnowledgeDocuments
      const knowledgeDocs = instance.knowledgeDocs || [];
      const hasKnowledgeDocs = knowledgeDocs.length > 0;

      // Vérifier si l'utilisateur a une base de connaissances vectorielle (ancien système)
      const documentsCount = await prisma.document.count({
        where: { userId: instance.userId },
      });

      let aiResponse: string = '';

      // Si c'est un groupe et pas de mention, on attend de voir la confiance
      if (isGroup && !shouldTrigger) {
        console.log(`[Webhook] 👥 Analyse de confiance pour déclenchement silencieux...`);
      }

      if (!hasKnowledgeDocs && documentsCount === 0) {
        // Pas de base de connaissances : utiliser Dify en fallback si configuré
        if (instance.difyAppId) {
          console.log(`[Webhook] Aucune base de connaissances, fallback vers Dify`);
          const difyApiKey = process.env.DIFY_API_KEY || '';
          const difyResponse = await sendMessageToDify(
            instance.difyAppId,
            difyApiKey,
            messageText
          );
          aiResponse = difyResponse.answer;
          // Note: On ne peut pas facilement avoir un score de confiance de Dify ici
          if (isGroup && !isMentioned) shouldTrigger = false; 
        } else {
          console.log(`[Webhook] Aucune base de connaissances et pas de Dify configuré`);
          if (!isGroup) {
            aiResponse = '⚠️ Aucune base de connaissances n\'est configurée. Veuillez uploader des documents depuis votre tableau de bord pour que je puisse vous aider.';
            // Tracker le fallback
            try {
              const sessionInfo = getActiveSession(instanceName, senderPhone);
              trackFallbackTriggered(
                senderPhone,
                instanceName,
                sessionInfo?.sessionId || 'unknown',
                'no_match',
                messageText.substring(0, 50),
              ).catch(() => {});
            } catch (_) { /* ignore analytics errors */ }
          }
        }
      } else {
        // Base de connaissances disponible : utiliser le pipeline RAG
        const groupPromptExtra = isGroup ? `
Tu es un assistant de groupe WhatsApp. Tu réponds UNIQUEMENT en te basant sur la base de connaissances fournie. 
RÈGLES CRUCIALES POUR LES GROUPES :
1. Sois extrêmement concis (maximum 2-3 phrases par réponse).
2. Si l'information n'est PAS dans ta base de connaissances ou si la question est hors-sujet, tu dois rester TOTALEMENT SILENCIEUX. Ne réponds pas "Je ne sais pas", ne réponds rien du tout.
3. Si tu n'es pas sûr de devoir répondre, ne réponds pas.` : '';

        // ===== CONTEXTE INSTITUTIONNEL UAUBEN =====
	      // Si l'instance est UAUBEN_SCHOOLL, injecter les annonces + document
	      let adminContextBlock = '';
	      if (instanceName === 'UAUBEN_SCHOOLL') {
	        try {
	          const { buildAdminContextForLLM } = await import('../services/adminContextService');
	          adminContextBlock = await buildAdminContextForLLM();
	          if (adminContextBlock) {
	            console.log(`[Webhook] 🏛️ Contexte institutionnel UAUBEN chargé (${adminContextBlock.length} car.)`);
	          }
	        } catch (ctxError) {
	          console.error('[Webhook] ⚠️ Erreur chargement contexte institutionnel:', ctxError);
	        }
	      }

	      const ragResult = await processRAGQuery(
          instance.userId,
          messageText,
          conversationHistory,
          (adminContextBlock ? adminContextBlock + '\n\n' : '') + (instance.systemPrompt || '') + groupPromptExtra,
          knowledgeDocs
        );

        // Déterminer si le bot doit répondre
        aiResponse = ragResult.answer;

        // Règle de déclenchement Groupe : Mention OU Confiance > 25%
        if (isGroup && !isMentioned && ragResult.maxSimilarity < 0.25) {
          console.log(`[Webhook] 👥 Confiance insuffisante (${(ragResult.maxSimilarity * 100).toFixed(1)}% < 25%) et pas de mention. Silence.`);
          return res.status(200).json({ success: true, message: 'Confiance insuffisante pour groupe' });
        }

        // Si on est dans un groupe et pas mentionné, on ne déclenche que si on a trouvé du contexte
        if (isGroup && !isMentioned && !ragResult.hasContext) {
          console.log(`[Webhook] 👥 Pas de contexte trouvé pour ce message de groupe. Silence.`);
          return res.status(200).json({ success: true, message: 'Pas de contexte pour groupe' });
        }

        shouldTrigger = true;
        
        if (aiResponse.includes('[IGNORE]') || aiResponse.trim() === '') {
          console.log(`[Webhook] 🤖 Bot a choisi d'ignorer le message (consigne silence)`);
          return res.status(200).json({ success: true, message: 'Message ignoré par le bot' });
        }

        // AJOUT: Notification Admin si l'IA n'a pas trouvé de réponse sémantique forte dans la base de connaissances
        // On considère qu'il n'y a pas de réponse si maxSimilarity est trop bas (< 0.45)
        // OU si la réponse contient des phrases types d'absence d'information
        const lowConfidence = !ragResult.hasSemanticContext || ragResult.maxSimilarity < 0.45;
        const isFallbackResponse = 
          aiResponse.toLowerCase().includes("pas d'information") || 
          aiResponse.toLowerCase().includes("pas d'info") || 
          aiResponse.toLowerCase().includes("je ne sais pas") ||
          aiResponse.toLowerCase().includes("administrateur") ||
          aiResponse.toLowerCase().includes("notifié") ||
          aiResponse.toLowerCase().includes("admin") ||
          aiResponse.toLowerCase().includes("pas trouvé d'information");

        const hasNoRealAnswer = lowConfidence || isFallbackResponse;
        
        console.log(`[Webhook] 🔍 Debug Admin Alert - instance.adminPhone: ${instance.adminPhone}, hasNoRealAnswer: ${hasNoRealAnswer} (lowConf: ${lowConfidence}, fallback: ${isFallbackResponse}), maxSimilarity: ${ragResult.maxSimilarity.toFixed(3)}, isMentioned: ${isMentioned}, isGroup: ${isGroup}`);
        
        if (hasNoRealAnswer && !instance.difyAppId && (isMentioned || !isGroup)) {
          if (instance.adminPhone) {
            console.log(`[Webhook] 🚨 Préparation envoi notification admin à ${instance.adminPhone}`);
            const adminNotifyMessage = `🚨 *Alerte IA NeoChat*\n\nL'IA n'a pas pu répondre avec précision à une question sur l'instance *${instance.instanceName}* (Confiance: ${(ragResult.maxSimilarity * 100).toFixed(1)}%).\n\n👤 *Client:* ${senderPhone}\n❓ *Question:* ${messageText}\n\n_L'IA a envoyé le message de fallback par défaut._`;
            
            await messageQueue.add('send-message', {
              instanceName,
              recipientPhone: instance.adminPhone,
              message: adminNotifyMessage,
              userId: instance.userId,
            });
            console.log(`[Webhook] 🚨 Notification admin envoyée à ${instance.adminPhone}`);
          }
        }

        // ===== TRACKING ANALYTICS (RAG) =====
        try {
          const sessionInfo = getActiveSession(instanceName, senderPhone);
          const currentSessionId = sessionInfo?.sessionId || 'unknown';
          const hasKnowledgeBase = knowledgeDocs && knowledgeDocs.length > 0;

          if (hasKnowledgeBase) {
            // 4. knowledge_base_hit / knowledge_base_miss
            const hasSemanticMatch = ragResult.hasSemanticContext && ragResult.maxSimilarity >= 0.2;

            if (hasSemanticMatch && ragResult.sourcesCount > 0) {
              const bestDocument = knowledgeDocs[0]?.name || 'vector_db';
              await trackKnowledgeBaseHit(
                senderPhone,
                instanceName,
                currentSessionId,
                bestDocument,
                ragResult.maxSimilarity,
                messageText.length,
              );
            } else {
              const fallbackTypeValue: 'low_confidence' | 'no_match' | 'error' =
                ragResult.maxSimilarity > 0 ? 'low_confidence' : 'no_match';
              await trackKnowledgeBaseMiss(
                senderPhone,
                instanceName,
                currentSessionId,
                messageText.length,
                fallbackTypeValue,
              );
            }
          }

          // 6. fallback_triggered
          if (isFallbackResponse) {
            await trackFallbackTriggered(
              senderPhone,
              instanceName,
              currentSessionId,
              'out_of_scope',
              messageText.substring(0, 50),
            );
          }
        } catch (analyticsError) {
          console.error(`[Analytics] ⚠️ Erreur tracking RAG:`, analyticsError);
        }
      }

      // ===== ENVOI DE LA RÉPONSE =====
      if (shouldTrigger && aiResponse) {
        // Envoyer la réponse via la queue
        await messageQueue.add('send-message', {
          instanceName,
          recipientPhone: remoteJid, // Utiliser remoteJid complet (avec @g.us ou @s.whatsapp.net)
          message: aiResponse,
          userId: instance.userId,
        });

        // Tracker la réponse du bot dans la session analytics
        try {
          trackBotResponse(instanceName, senderPhone);
        } catch (analyticsError) {
          console.error(`[Analytics] ⚠️ Erreur tracking réponse bot:`, analyticsError);
        }

        // Incrémenter le compteur de messages
        const newMessageCount = subscription.messageCount + 1;
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { messageCount: newMessageCount },
        });

        // Logger l'activité du message sortant
        try {
          await prisma.messageActivity.create({
            data: {
              instanceId: instance.id,
              instanceName: instance.instanceName,
              direction: 'OUTGOING',
              senderPhone: senderPhone,
              messageText: aiResponse.substring(0, 500),
              isGroupMessage: isGroup,
              groupId: isGroup ? remoteJid : null,
              wasAnswered: true,
            },
          });
        } catch (logError) {
          console.error(`[Webhook] ⚠️ Erreur logging message sortant:`, logError);
        }

        // Mettre à jour le message entrant comme répondu (le dernier message entrant de ce sender)
        try {
          await prisma.messageActivity.updateMany({
            where: {
              instanceId: instance.id,
              senderPhone: senderPhone,
              direction: 'INCOMING',
              wasAnswered: false,
            },
            data: { wasAnswered: true },
          });
        } catch (logError) {
          console.error(`[Webhook] ⚠️ Erreur mise à jour message entrant:`, logError);
        }

        console.log(`[Webhook] ✅ Réponse envoyée (${isGroup ? 'Groupe' : 'Privé'})`);
      }

      return res.status(200).json({ success: true });

    } catch (aiError: any) {
      console.error('[Webhook] Erreur lors du traitement RAG:', aiError);
      return res.status(500).json({
        success: false,
        error: 'Une erreur est survenue lors du traitement RAG',
        details: process.env.NODE_ENV === 'development' ? aiError.message : undefined,
      });
    }

  } catch (error: any) {
    console.error('[Webhook] Erreur globale webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur critique est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
