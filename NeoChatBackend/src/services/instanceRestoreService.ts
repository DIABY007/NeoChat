import prisma from '../config/prisma';
import { configureWebhook } from './evolutionInstanceService';
import axios from 'axios';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

/**
 * Vérifie l'état de connexion d'une instance sur Evolution API
 */
async function checkInstanceConnection(instanceName: string): Promise<string> {
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );
    
    return response.data?.instance?.state || 'close';
  } catch (error: any) {
    console.error(`[Restore] Erreur vérification instance ${instanceName}:`, error.message);
    return 'close';
  }
}

/**
 * Restaure toutes les instances actives au démarrage du serveur
 */
export async function restoreActiveInstances(): Promise<void> {
  try {
    console.log('\n🔄 [Restore] Restauration des instances WhatsApp...');

    // Récupérer toutes les instances qui étaient connectées
    const instances = await prisma.instance.findMany({
      where: {
        status: {
          in: ['CONNECTED', 'CONNECTING']
        }
      },
      select: {
        id: true,
        instanceName: true,
        status: true,
        userId: true,
      }
    });

    if (instances.length === 0) {
      console.log('✅ [Restore] Aucune instance à restaurer');
      return;
    }

    console.log(`📋 [Restore] ${instances.length} instance(s) trouvée(s)`);

    // Vérifier et restaurer chaque instance
    for (const instance of instances) {
      try {
        console.log(`\n🔍 [Restore] Vérification: ${instance.instanceName}`);

        // Vérifier l'état réel sur Evolution API
        const actualState = await checkInstanceConnection(instance.instanceName);
        
        console.log(`   État Evolution API: ${actualState}`);
        console.log(`   État en base: ${instance.status}`);

        if (actualState === 'open') {
          // Instance toujours connectée
          console.log(`   ✅ Instance connectée`);
          
          // Mettre à jour le statut en base
          await prisma.instance.update({
            where: { id: instance.id },
            data: { status: 'CONNECTED' }
          });

          // Reconfigurer le webhook pour être sûr
          try {
            await configureWebhook(instance.instanceName);
            console.log(`   ✅ Webhook reconfiguré`);
          } catch (webhookError: any) {
            console.error(`   ⚠️ Erreur webhook (non bloquant):`, webhookError.message);
          }

        } else {
          // Instance déconnectée
          console.log(`   ⚠️ Instance déconnectée, mise à jour du statut`);
          
          await prisma.instance.update({
            where: { id: instance.id },
            data: { status: 'CONNECTING' }
          });
        }

      } catch (error: any) {
        console.error(`   ❌ Erreur restauration ${instance.instanceName}:`, error.message);
      }
    }

    console.log('\n✅ [Restore] Restauration terminée\n');

  } catch (error: any) {
    console.error('❌ [Restore] Erreur lors de la restauration des instances:', error.message);
  }
}

/**
 * Synchronise périodiquement l'état des instances
 */
export async function startInstanceSync(): Promise<void> {
  // Synchronisation toutes les 5 minutes
  const SYNC_INTERVAL = 5 * 60 * 1000;

  setInterval(async () => {
    try {
      const instances = await prisma.instance.findMany({
        where: {
          status: {
            in: ['CONNECTED', 'CONNECTING']
          }
        },
        select: {
          id: true,
          instanceName: true,
          status: true,
        }
      });

      for (const instance of instances) {
        const actualState = await checkInstanceConnection(instance.instanceName);
        
        const newStatus = actualState === 'open' ? 'CONNECTED' : 'CONNECTING';
        
        if (instance.status !== newStatus) {
          console.log(`[Sync] ${instance.instanceName}: ${instance.status} → ${newStatus}`);
          
          await prisma.instance.update({
            where: { id: instance.id },
            data: { status: newStatus }
          });
        }
      }
    } catch (error: any) {
      console.error('[Sync] Erreur synchronisation:', error.message);
    }
  }, SYNC_INTERVAL);

  console.log('✅ [Sync] Synchronisation des instances démarrée (toutes les 5 min)');
}
