import axios from 'axios';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const SYSTEM_INSTANCE = process.env.EVOLUTION_SYSTEM_INSTANCE || 'NeoChat_System';
const SYSTEM_PHONE = process.env.SYSTEM_PHONE || process.env.EVOLUTION_SYSTEM_PHONE || 'NeoChat_System';

interface MessageTemplate {
  type: string;
  content: string;
}

export class SystemMessagesService {
  private static async sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
    try {
      const cleanedNumber = phone.replace(/[^0-9]/g, '');
      const response = await axios.post(
        `${EVOLUTION_API_URL}/message/sendText/${SYSTEM_INSTANCE}`,
        {
          number: cleanedNumber,
          text: message,
        },
        {
          headers: {
            'apikey': EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`[SystemMessages] Message envoyé à ${cleanedNumber} depuis ${SYSTEM_PHONE}`);
      return true;
    } catch (error: any) {
      console.error(`[SystemMessages] Erreur lors de l'envoi:`, error.message);
      throw new Error('Impossible d\'envoyer le message système via WhatsApp');
    }
  }

  static async sendOTP(phone: string, otpCode: string): Promise<boolean> {
    const message = `🔐 *Code de vérification NeoChat*\n\nVotre code OTP est : *${otpCode}*\n\nCe code expire dans 5 minutes.\n\n⚠️ Ne partagez ce code avec personne.`;
    return this.sendWhatsAppMessage(phone, message);
  }

  static async sendWelcomeMessage(phone: string, firstName: string): Promise<boolean> {
    const message = `🎉 *Bienvenue sur NeoChat, ${firstName} !*\n\nTon compte est créé et prêt à être utilisé. Tu es à quelques clics de transformer ton WhatsApp en une vraie machine de guerre pour ton business. 🚀\n\n*Voici tes 3 prochaines étapes pour démarrer :*\n\n1️⃣ *Connecte ton numéro* : Scanne le QR code (ou utilise le code de jumelage) pour lier ton WhatsApp.\n\n2️⃣ *Configure ton assistant* : Ajoute tes documents (PDF/Texte) pour que ton IA apprenne à connaître tes produits.\n\n3️⃣ *Lance ta première diffusion* : Envoie ta première campagne à tes clients !\n\n💡 *Besoin d'aide ?* Réponds simplement à ce message.\n\nÀ très vite de l'autre côté ! ✨`;
    return this.sendWhatsAppMessage(phone, message);
  }

  static async sendInstanceConnected(phone: string, instanceName: string): Promise<boolean> {
    const message = `✅ *Instance WhatsApp connectée !*\n\nFélicitations ! Ton instance *${instanceName}* est maintenant connectée avec succès.\n\nTon bot est opérationnel et prêt à répondre à tes clients automatiquement.\n\n💡 Tu peux maintenant configurer ton assistant IA dans la section "Base de Connaissances".`;
    return this.sendWhatsAppMessage(phone, message);
  }

  static async sendInstanceDisconnected(phone: string, instanceName: string): Promise<boolean> {
    const message = `⚠️ *ALERTE : Instance déconnectée*\n\nTon instance WhatsApp *${instanceName}* s'est déconnectée.\n\n*Action requise :*\nReconnecte-toi immédiatement pour que ton bot continue de fonctionner :\n• Scanne à nouveau le QR code\n• Ou utilise un nouveau code de jumelage\n\n⏰ Ton bot ne répond plus à tes clients tant que l'instance n'est pas reconnectée.`;
    return this.sendWhatsAppMessage(phone, message);
  }

  static async sendPaymentSuccess(phone: string, firstName: string, plan: string): Promise<boolean> {
    const message = `🎉 *Merci pour ton paiement, ${firstName} !*\n\nTon abonnement *${plan}* a été activé avec succès.\n\nTu peux désormais profiter de toutes les fonctionnalités de NeoChat.\n\n📊 Consulte ton tableau de bord pour voir tes nouvelles limites.\n\n💡 Besoin d'aide ? Réponds à ce message.`;
    return this.sendWhatsAppMessage(phone, message);
  }

  static async sendPaymentFailed(phone: string): Promise<boolean> {
    const message = `❌ *Échec de paiement*\n\nTon paiement n'a pas pu être traité.\n\n*Action requise :*\n• Vérifie tes informations de paiement\n• Réessaie la transaction\n\n💡 Si tu as besoin d'aide, réponds directement à ce message.`;
    return this.sendWhatsAppMessage(phone, message);
  }

  static async sendRenewalReminder(phone: string, firstName: string, daysLeft: number, plan: string, amount: number, renewalDate: string): Promise<boolean> {
    let message = '';
    
    if (daysLeft === 15) {
      message = `📅 *Rappel de renouvellement*\n\nSalut ${firstName}, on anticipe un peu ! 🗓️\n\nTon abonnement *${plan}* se renouvelle dans *15 jours* (le ${renewalDate}).\n\nPour que ton assistant IA continue de répondre à tes clients sans interruption, assure-toi que ton moyen de paiement est à jour.\n\n💰 Montant : *${amount} FCFA*`;
    } else if (daysLeft === 7) {
      message = `⏳ *Plus que 7 jours !*\n\n${firstName}, tes clients adorent la réactivité de ton bot. Ne les laisse pas sans réponse !\n\nTon abonnement *${plan}* se renouvelle le *${renewalDate}*.\n\nAssure-toi que ton paiement de *${amount} FCFA* passera bien.\n\n💡 Vérifie ton compte maintenant.`;
    } else if (daysLeft === 3) {
      message = `⚠️ *ACTION REQUISE : Il ne te reste plus que 3 jours !*\n\nTon abonnement *${plan}* expire le *${renewalDate}*.\n\n*Si le renouvellement échoue :*\n❌ Ton bot sera mis en pause\n❌ Tes campagnes seront bloquées\n\n💰 Montant : *${amount} FCFA*\n\n🔄 Renouvelle maintenant pour garder NeoChat actif.`;
    } else if (daysLeft === 0) {
      message = `🚨 *C'EST LE DERNIER JOUR, ${firstName} !*\n\nTon abonnement NeoChat expire *AUJOURD'HUI*.\n\n⏰ À minuit, ton assistant IA cessera de répondre à tes clients.\n\n*Ne perds pas de ventes !*\n💰 Valide ton paiement de *${amount} FCFA* maintenant.\n\n🔄 Clique ici pour sauvegarder ton bot.`;
    }
    
    return this.sendWhatsAppMessage(phone, message);
  }

  static async sendServiceSuspended(phone: string, firstName: string): Promise<boolean> {
    const message = `⏸️ *Ton service NeoChat est actuellement en pause, ${firstName}.*\n\nTon abonnement est arrivé à expiration et nous n'avons pas pu valider ton dernier paiement.\n\n*Concrètement, qu'est-ce que ça veut dire ?*\n❌ Ton assistant IA ne répond plus à tes clients sur WhatsApp\n❌ Tes campagnes de diffusion sont bloquées\n\n*Mais pas de panique !*\nToute ta configuration, tes PDF et tes statistiques sont bien au chaud. Tu peux relancer ton bot instantanément en régularisant ton compte.\n\n🔄 Réactive ton bot maintenant\n\n💡 Si tu as rencontré un problème technique ou que tu as besoin d'aide pour ton abonnement, réponds simplement à ce message. L'équipe est là pour toi !`;
    return this.sendWhatsAppMessage(phone, message);
  }

  static async sendQuotaWarning(phone: string, quotaType: string, percentageUsed: number, remaining: number, limit: number): Promise<boolean> {
    const message = `⚠️ *Alerte de consommation*\n\nTu as consommé *${percentageUsed}%* de tes ${quotaType}.\n\n📊 *Utilisation :* ${limit - remaining} / ${limit}\n💡 *Restant :* ${remaining}\n\n${percentageUsed >= 90 ? '🚨 Attention ! Il te reste moins de 10% de ton quota.' : '💡 Pense à passer au plan supérieur pour plus de capacité.'}\n\n📈 Upgrade ton abonnement pour continuer sans interruption.`;
    return this.sendWhatsAppMessage(phone, message);
  }

  static async sendQuotaExhausted(phone: string, quotaType: string): Promise<boolean> {
    const message = `🚫 *Quota épuisé*\n\nTu as atteint la limite de ton quota ${quotaType}.\n\n⏸️ Ton bot est temporairement en pause jusqu'au prochain cycle de facturation.\n\n*Solutions :*\n• Attends le renouvellement de ton abonnement\n• Passe à un plan supérieur pour continuer immédiatement\n\n📈 Upgrade maintenant pour débloquer ton service.`;
    return this.sendWhatsAppMessage(phone, message);
  }

  static async sendBroadcastComplete(phone: string, campaignName: string, successCount: number, totalCount: number): Promise<boolean> {
    const message = `📊 *Rapport de campagne*\n\nTa campagne *${campaignName}* est terminée !\n\n✅ *Messages envoyés :* ${successCount} / ${totalCount}\n📈 *Taux de réussite :* ${Math.round((successCount / totalCount) * 100)}%\n\n${successCount === totalCount ? '🎉 Tous les messages ont été envoyés avec succès !' : '⚠️ Certains messages n\'ont pas pu être envoyés.'}\n\n💡 Consulte ton tableau de bord pour plus de détails.`;
    return this.sendWhatsAppMessage(phone, message);
  }

  static async sendKnowledgeProcessed(phone: string, documentName: string, success: boolean): Promise<boolean> {
    const message = success
      ? `✅ *Document traité avec succès*\n\nTon document *${documentName}* a été analysé et ajouté à ta base de connaissances.\n\n🤖 Ton assistant IA peut maintenant utiliser ces informations pour répondre à tes clients.\n\n💡 Tu peux ajouter d'autres documents pour enrichir ton bot.`
      : `❌ *Erreur de traitement*\n\nNous n'avons pas pu traiter ton document *${documentName}*.\n\n*Causes possibles :*\n• Format de fichier non supporté\n• Document corrompu\n• Fichier trop volumineux\n\n💡 Réessaie avec un autre fichier ou contacte le support.`;
    
    return this.sendWhatsAppMessage(phone, message);
  }

  static async sendBotStatusChanged(phone: string, instanceName: string, isActive: boolean): Promise<boolean> {
    const message = isActive
      ? `✅ *Bot activé*\n\nTon bot *${instanceName}* est maintenant actif.\n\n🤖 Il va répondre automatiquement à tous les messages entrants.\n\n💡 Tu peux le mettre en pause à tout moment depuis ton tableau de bord.`
      : `⏸️ *Bot mis en pause*\n\nTon bot *${instanceName}* est maintenant en pause.\n\n📵 Il ne répondra plus aux messages automatiquement.\n\n💡 Réactive-le quand tu veux depuis ton tableau de bord.`;
    
    return this.sendWhatsAppMessage(phone, message);
  }

  static async sendPromoCodeConfirmation(phone: string, firstName: string, discount: number): Promise<boolean> {
    const message = `🎁 *Code promo validé !*\n\nFélicitations ${firstName} !\n\nTon code promo a été appliqué avec succès.\n\n💰 *Réduction :* ${discount} FCFA\n\nCette réduction sera appliquée sur ton prochain paiement.\n\n🎉 Profite bien de NeoChat !`;
    return this.sendWhatsAppMessage(phone, message);
  }
}

export default SystemMessagesService;
