import axios from 'axios';
import prisma from '../config/prisma';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

export interface CreateInstanceResponse {
  instanceName: string;
  status: string;
}

export interface PairingCodeResponse {
  code: string;
  instanceName: string;
}

/**
 * Crée une instance WhatsApp configurée pour le Pairing Code (Evolution API v2.3.7+)
 * IMPORTANT: Le numéro de téléphone DOIT être fourni lors de la création pour activer le mode Pairing Code
 * 
 * Selon la documentation Evolution API:
 * - Pour Pairing Code: qrcode=false + number obligatoire
 * - Pour QR Code: qrcode=true (number optionnel)
 */
const BACKEND_WEBHOOK_URL = process.env.BACKEND_WEBHOOK_URL || 'http://localhost:3001/api/webhook/evolution';

export async function createEvolutionInstance(instanceName: string, usePairingCode: boolean = false, phoneNumber?: string): Promise<CreateInstanceResponse> {
  try {
    console.log(`[Evolution] 🚀 Création de l'instance: ${instanceName}`);
    console.log(`[Evolution] Mode: ${usePairingCode ? 'Pairing Code ✅' : 'QR Code'}`);

    // Validation stricte pour le mode Pairing Code
    if (usePairingCode && !phoneNumber) {
      throw new Error('Le numéro de téléphone est OBLIGATOIRE pour créer une instance en mode Pairing Code');
    }

    const requestBody: any = {
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
    };

    if (usePairingCode && phoneNumber) {
      // Mode Pairing Code: qrcode DOIT être false et number DOIT être fourni
      const cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');
      
      // FORCER le mode Pairing Code avec tous les paramètres nécessaires
      requestBody.qrcode = false;  // EXPLICITEMENT false pour Pairing Code
      requestBody.number = cleanedNumber;  // Numéro OBLIGATOIRE
      requestBody.reject_call = false;  // Paramètre additionnel pour Evolution API v2
      requestBody.msg_call = '';  // Message vide pour les appels
      
      console.log(`[Evolution] 📱 Configuration Pairing Code (FORCÉ):`);
      console.log(`[Evolution]    - qrcode: false`);
      console.log(`[Evolution]    - number: ${cleanedNumber}`);
      console.log(`[Evolution]    - reject_call: false`);
    } else {
      // Mode QR Code classique
      requestBody.qrcode = true;
      console.log(`[Evolution] 📷 Configuration QR Code: qrcode = true`);
    }

    console.log(`[Evolution] 📤 Envoi de la requête à Evolution API...`);
    console.log(`[Evolution] Body:`, JSON.stringify(requestBody, null, 2));

    let createResponse;
    try {
      createResponse = await axios.post(
        `${EVOLUTION_API_URL}/instance/create`,
        requestBody,
        {
          headers: {
            'apikey': EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (createError: any) {
      // Gestion intelligente des conflits de nom (session fantôme)
      if (createError.response?.status === 403) {
        const errorMessage = createError.response?.data?.message || createError.response?.data?.error || '';
        const isNameConflict = errorMessage.toLowerCase().includes('already') || 
                               errorMessage.toLowerCase().includes('existe') ||
                               errorMessage.toLowerCase().includes('name');
        
        if (isNameConflict) {
          console.log(`[Evolution] ⚠️ Conflit de nom détecté: ${errorMessage}`);
          console.log(`[Evolution] 🔄 Auto-nettoyage: Purge de l'ancienne session...`);
          
          // Purge complète de l'ancienne instance
          try {
            await hardDeleteInstance(instanceName);
            console.log(`[Evolution] ✅ Purge terminée, nouvelle tentative de création...`);
            
            // Attendre 2 secondes supplémentaires pour être sûr
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Réessayer la création
            createResponse = await axios.post(
              `${EVOLUTION_API_URL}/instance/create`,
              requestBody,
              {
                headers: {
                  'apikey': EVOLUTION_API_KEY,
                  'Content-Type': 'application/json',
                },
              }
            );
            console.log(`[Evolution] ✅ Instance créée après auto-nettoyage`);
          } catch (retryError: any) {
            console.error(`[Evolution] ❌ Échec après auto-nettoyage:`, retryError.message);
            throw retryError;
          }
        } else {
          throw createError;
        }
      } else {
        throw createError;
      }
    }

    console.log(`[Evolution] ✅ Instance créée avec succès: ${instanceName}`);
    console.log(`[Evolution] Réponse API:`, JSON.stringify(createResponse.data, null, 2));

    // Si mode Pairing Code, attendre 2 secondes pour que l'instance s'initialise
    if (usePairingCode) {
      console.log(`[Evolution] ⏳ Attente de 2 secondes pour l'initialisation...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Configurer automatiquement le webhook pour recevoir les messages
    try {
      console.log(`[Evolution] 🔗 Configuration du webhook pour ${instanceName}...`);
      await configureWebhook(instanceName);
      console.log(`[Evolution] ✅ Webhook configuré avec succès`);
    } catch (webhookError: any) {
      console.error(`[Evolution] ⚠️ Erreur configuration webhook (non bloquant):`, webhookError.message);
      // Ne pas bloquer la création si le webhook échoue
    }

    return {
      instanceName,
      status: 'connecting',
    };
  } catch (error: any) {
    console.error(`[Evolution] ❌ Erreur lors de la création de l'instance:`, error.message);
    if (error.response) {
      console.error(`[Evolution] Statut HTTP: ${error.response.status}`);
      console.error(`[Evolution] Détails:`, JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`Impossible de créer l'instance WhatsApp: ${error.message}`);
  }
}

/**
 * Configure le webhook pour une instance Evolution API
 */
export async function configureWebhook(instanceName: string): Promise<void> {
  try {
    console.log(`[Evolution] Configuration webhook pour: ${instanceName}`);
    console.log(`[Evolution] Webhook URL: ${BACKEND_WEBHOOK_URL}`);

    const response = await axios.post(
      `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
      {
        webhook: {
          enabled: true,
          url: BACKEND_WEBHOOK_URL,
          webhook_by_events: false,
          webhook_base64: false,
          events: [
            'QRCODE_UPDATED',
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'CONNECTION_UPDATE'
          ]
        }
      },
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[Evolution] ✅ Webhook configuré:`, response.data);
  } catch (error: any) {
    console.error(`[Evolution] ❌ Erreur configuration webhook:`, error.message);
    if (error.response) {
      console.error(`[Evolution] Détails:`, JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

export async function getQRCode(instanceName: string): Promise<string | null> {
  try {
    console.log(`[Evolution] Récupération du QR code pour: ${instanceName}`);

    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connect/${encodeURIComponent(instanceName)}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );

    // LOG VITAL POUR LE DEBUG
    console.log('[Evolution API] Réponse Brute:', JSON.stringify(response.data, null, 2));
    
    // Vérifier si l'instance a bien été créée en mode Pairing Code
    if (response.data?.instance) {
      console.log('[Evolution API] Instance créée:');
      console.log(`  - Name: ${response.data.instance.instanceName}`);
      console.log(`  - State: ${response.data.instance.state}`);
      console.log(`  - Owner: ${response.data.instance.owner}`);
    }

    // Vérifier si l'instance est déjà connectée
    if (response.data?.instance?.state === 'open') {
      console.log(`[Evolution] ✅ Instance déjà connectée: ${instanceName}`);
      return null; // Pas de QR code car déjà connecté
    }

    // Extraction robuste pour Evolution API v2
    let base64Image: string | null = null;
    if (response.data?.base64) {
      base64Image = response.data.base64;
    } else if (response.data?.qrcode?.base64) {
      base64Image = response.data.qrcode.base64;
    }

    if (base64Image) {
      console.log(`[Evolution] QR code récupéré pour: ${instanceName}`);
      
      // Sécurité pour le préfixe
      if (!base64Image.startsWith('data:image')) {
        base64Image = `data:image/png;base64,${base64Image.replace('data:image/png;base64,', '')}`;
      }
      
      return base64Image;
    }

    console.log(`[Evolution] QR code pas encore disponible pour: ${instanceName}`);
    return null;
  } catch (error: any) {
    console.error(`[Evolution] Erreur lors de la récupération du QR code:`, error.message);
    return null;
  }
}

async function logoutInstance(instanceName: string): Promise<void> {
  try {
    console.log(`[Evolution] 🔓 Déconnexion préventive de l'instance: ${instanceName}`);
    await axios.delete(
      `${EVOLUTION_API_URL}/instance/logout/${encodeURIComponent(instanceName)}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );
    console.log(`[Evolution] ✅ Instance déconnectée: ${instanceName}`);
  } catch (error: any) {
    console.log(`[Evolution] ⚠️ Déconnexion ignorée (instance peut-être déjà déconnectée): ${error.message}`);
  }
}

/**
 * Récupère le Pairing Code pour une instance WhatsApp (Evolution API v2.3.7+)
 * L'instance DOIT avoir été créée avec qrcode=false et number fourni
 * 
 * Méthode selon Evolution API:
 * 1. L'instance doit être créée avec qrcode=false et number
 * 2. Appeler GET /instance/connect/{instance} pour obtenir le pairingCode
 * 3. Le code est dans response.data.pairingCode
 */
export async function getPairingCode(instanceName: string, phoneNumber: string): Promise<PairingCodeResponse> {
  try {
    const cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');
    
    console.log(`[Evolution] 🔑 Demande de Pairing Code`);
    console.log(`[Evolution]    - Instance: ${instanceName}`);
    console.log(`[Evolution]    - Numéro: ${cleanedNumber}`);

    // Tentatives multiples car le code peut prendre quelques secondes à être généré
    const maxRetries = 5;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Evolution] 📡 Tentative ${attempt}/${maxRetries}...`);
        
        // Endpoint: GET /instance/connect/{instance}
        // IMPORTANT: Depuis Evolution API v2.3.7, le numéro DOIT être passé en query parameter
        // Sinon l'API retourne un QR Code au lieu du Pairing Code
        const response = await axios.get(
          `${EVOLUTION_API_URL}/instance/connect/${encodeURIComponent(instanceName)}`,
          {
            params: {
              number: cleanedNumber,  // Query parameter obligatoire pour le Pairing Code
            },
            headers: {
              'apikey': EVOLUTION_API_KEY,
            },
          }
        );

        console.log('[Evolution] 📥 Réponse Evolution API:', JSON.stringify(response.data, null, 2));

        // Vérifier si l'instance est déjà connectée
        if (response.data?.instance?.state === 'open') {
          console.log(`[Evolution] ✅ Instance déjà connectée`);
          throw new Error('Instance déjà connectée à WhatsApp');
        }

        // Extraire le pairing code selon la doc: { pairingCode: "WZYEH1YY", code: "2@...", count: 1 }
        const pairingCode = response.data?.pairingCode;

        if (pairingCode) {
          console.log(`[Evolution] ✅ Pairing Code récupéré: ${pairingCode}`);

          // Stocker le pairing code en base de données
          await prisma.instance.updateMany({
            where: { instanceName },
            data: { 
              pairingCode,
              updatedAt: new Date(),
            },
          });

          return {
            code: pairingCode,
            instanceName,
          };
        }

        // Diagnostic si pas de pairing code
        if (response.data?.base64 || (response.data?.code && response.data.code.includes('@'))) {
          console.error(`[Evolution] 🚨 DIAGNOSTIC: L'instance est en mode QR Code, pas en mode Pairing Code`);
          console.error(`[Evolution] 💡 SOLUTION: Supprimez l'instance et recréez-la avec qrcode=false et number`);
          throw new Error('Cette instance a été créée en mode QR Code. Pour utiliser le code de jumelage, vous devez supprimer cette instance et en créer une nouvelle.');
        }
        
        if (response.data?.count === 0) {
          console.log(`[Evolution] ⏳ Code pas encore disponible (count: 0), attente...`);
          lastError = new Error('Code pas encore disponible');
          
          // Attendre avant la prochaine tentative (sauf dernière tentative)
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
        }
        
        throw new Error('Pairing code non disponible dans la réponse');
        
      } catch (error: any) {
        lastError = error;
        
        // Si c'est une erreur définitive, on arrête
        if (error.message.includes('mode QR Code') || error.message.includes('déjà connectée')) {
          throw error;
        }
        
        // Sinon on continue les tentatives
        if (attempt < maxRetries) {
          console.log(`[Evolution] ⏳ Attente avant nouvelle tentative...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // Si on arrive ici, toutes les tentatives ont échoué
    console.error(`[Evolution] ❌ Échec après ${maxRetries} tentatives`);
    console.error(`[Evolution] Dernière erreur:`, lastError?.message);
    throw new Error(`Impossible de générer le code de jumelage. L'instance n'a peut-être pas été créée correctement. Veuillez la supprimer et en créer une nouvelle.`);
    
  } catch (error: any) {
    console.error(`[Evolution] ❌ Erreur lors de la génération du Pairing Code:`, error.message);
    if (error.response) {
      console.error(`[Evolution] Statut HTTP: ${error.response.status}`);
      console.error(`[Evolution] Réponse API:`, JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(error.message || 'Impossible de générer le code de jumelage');
  }
}

export async function deleteEvolutionInstance(instanceName: string): Promise<void> {
  try {
    console.log(`[Evolution] Suppression de l'instance: ${instanceName}`);

    await axios.delete(
      `${EVOLUTION_API_URL}/instance/delete/${instanceName}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );

    console.log(`[Evolution] Instance supprimée: ${instanceName}`);
  } catch (error: any) {
    console.error(`[Evolution] Erreur lors de la suppression de l'instance:`, error.message);
    throw new Error('Impossible de supprimer l\'instance WhatsApp');
  }
}

/**
 * Suppression complète d'une instance (Evolution API + Hard Delete Prisma)
 * Cette fonction garantit une suppression totale sans traces
 */
export async function hardDeleteInstance(instanceName: string): Promise<void> {
  console.log(`[Evolution] 🗑️ Début de la suppression complète de l'instance: ${instanceName}`);
  
  try {
    // Étape 1: Déconnecter l'instance si elle est connectée
    console.log(`[Evolution] Étape 1/3: Déconnexion de l'instance...`);
    try {
      await axios.delete(
        `${EVOLUTION_API_URL}/instance/logout/${encodeURIComponent(instanceName)}`,
        {
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        }
      );
      console.log(`[Evolution] ✅ Instance déconnectée`);
    } catch (logoutError: any) {
      console.log(`[Evolution] ⚠️ Déconnexion ignorée (instance peut-être déjà déconnectée)`);
    }

    // Étape 2: Supprimer l'instance de l'Evolution API
    console.log(`[Evolution] Étape 2/3: Suppression de l'instance sur Evolution API...`);
    try {
      await axios.delete(
        `${EVOLUTION_API_URL}/instance/delete/${encodeURIComponent(instanceName)}`,
        {
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        }
      );
      console.log(`[Evolution] ✅ Instance supprimée de l'Evolution API`);
    } catch (deleteError: any) {
      console.error(`[Evolution] ⚠️ Erreur lors de la suppression Evolution API:`, deleteError.message);
      // On continue quand même pour nettoyer la base de données
    }

    // Étape 3: Hard Delete dans Prisma (suppression définitive)
    console.log(`[Evolution] Étape 3/3: Hard Delete dans la base de données...`);
    const deletedCount = await prisma.instance.deleteMany({
      where: { instanceName },
    });
    
    console.log(`[Evolution] ✅ ${deletedCount.count} enregistrement(s) supprimé(s) de la base de données`);
    
    // CRUCIAL: Pause de 2 secondes pour laisser le système de fichiers purger les fichiers Baileys
    console.log(`[Evolution] ⏳ Pause de 2 secondes pour purge complète des fichiers de session...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`[Evolution] 🎉 Suppression complète terminée pour: ${instanceName}`);
  } catch (error: any) {
    console.error(`[Evolution] ❌ Erreur lors de la suppression complète:`, error.message);
    throw new Error(`Impossible de supprimer complètement l'instance: ${error.message}`);
  }
}

export async function getInstanceStatus(instanceName: string): Promise<any> {
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error(`[Evolution] Erreur lors de la récupération du statut:`, error.message);
    throw new Error('Impossible de récupérer le statut de l\'instance');
  }
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  profilePicUrl?: string;
}

export interface Group {
  id: string;
  name: string;
  participantsCount: number;
  profilePicUrl?: string;
}

export async function getContactsAndGroups(instanceName: string): Promise<{ contacts: any[], groups: any[] }> {
  try {
    console.log(`[Evolution] Récupération des contacts et groupes pour: ${instanceName}`);

    const contacts: any[] = [];
    const groups: any[] = [];

    // Récupérer les contacts via POST /chat/findContacts
    try {
      const contactsResponse = await axios.post(
        `${EVOLUTION_API_URL}/chat/findContacts/${instanceName}`,
        {
          where: {}
        },
        {
          headers: {
            'apikey': EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      const contactsData = Array.isArray(contactsResponse.data) ? contactsResponse.data : [];
      
      console.log(`\n[Evolution DEBUG] ========================================`);
      console.log(`[Evolution DEBUG] ANALYSE BRUTE DE LA STRUCTURE DES CONTACTS`);
      console.log(`[Evolution DEBUG] ========================================`);
      console.log(`[Evolution DEBUG] Nombre total de contacts reçus: ${contactsData.length}`);
      
      // Afficher les 5 premiers contacts en détail
      console.log(`\n[Evolution DEBUG] --- 5 PREMIERS CONTACTS BRUTS ---`);
      contactsData.slice(0, 5).forEach((contact, index) => {
        console.log(`\n=== Contact ${index + 1} ===`);
        console.log(JSON.stringify(contact, null, 2));
      });
      
      // Afficher les 5 derniers contacts pour comparaison
      console.log(`\n[Evolution DEBUG] --- 5 DERNIERS CONTACTS BRUTS ---`);
      contactsData.slice(-5).forEach((contact, index) => {
        console.log(`\n=== Contact ${contactsData.length - 4 + index} ===`);
        console.log(JSON.stringify(contact, null, 2));
      });
      
      // Analyser les propriétés disponibles
      console.log(`\n[Evolution DEBUG] --- ANALYSE DES PROPRIÉTÉS ---`);
      const sampleContact = contactsData[0];
      if (sampleContact) {
        console.log(`Propriétés disponibles:`, Object.keys(sampleContact));
      }
      
      // Statistiques sur les propriétés
      const stats = {
        withName: contactsData.filter((c: any) => c.name).length,
        withPushName: contactsData.filter((c: any) => c.pushName).length,
        withIsSaved: contactsData.filter((c: any) => c.isSaved === true).length,
        withRemoteJid: contactsData.filter((c: any) => c.remoteJid).length,
      };
      console.log(`[Evolution DEBUG] Statistiques:`, stats);
      console.log(`[Evolution DEBUG] ========================================\n`);
      
      for (const contact of contactsData) {
        // Extraire le vrai identifiant WhatsApp depuis remoteJid ou jid
        const contactId = contact.remoteJid || contact.jid || contact.id;
        
        // Vérifier que c'est un utilisateur individuel (pas un groupe)
        const isUser = contactId && contactId.endsWith('@s.whatsapp.net');
        
        // Vérifier que c'est un vrai contact (pas un membre de groupe inconnu)
        const isSavedContact = contact.isSaved === true;
        
        if (isUser && isSavedContact) {
          contacts.push({
            id: contactId,
            pushName: contact.pushName || contact.name || contactId.split('@')[0],
            profilePictureUrl: contact.profilePictureUrl || contact.profilePicUrl,
          });
        }
      }
      
      console.log(`[Evolution] ${contacts.length} contacts récupérés (${contactsData.length} total)`);
    } catch (contactError: any) {
      console.log(`[Evolution] Erreur lors de la récupération des contacts:`, contactError.message);
    }

    // Récupérer les groupes
    try {
      const groupsResponse = await axios.get(
        `${EVOLUTION_API_URL}/group/fetchAllGroups/${instanceName}`,
        {
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
          params: {
            getParticipants: 'true'
          }
        }
      );

      const groupsData = Array.isArray(groupsResponse.data) ? groupsResponse.data : [];
      
      for (const group of groupsData) {
        if (group.id) {
          groups.push({
            id: group.id,
            subject: group.subject || group.name || 'Groupe sans nom',
            size: group.size || group.participants?.length || 0,
          });
        }
      }
      
      console.log(`[Evolution] ${groups.length} groupes récupérés`);
    } catch (groupError: any) {
      console.log(`[Evolution] Erreur groupes:`, groupError.message);
    }

    console.log(`[Evolution] Total: ${contacts.length} contacts et ${groups.length} groupes`);

    return { contacts, groups };
  } catch (error: any) {
    console.error(`[Evolution] Erreur lors de la récupération des contacts:`, error.message);
    throw new Error('Impossible de récupérer les contacts et groupes');
  }
}
