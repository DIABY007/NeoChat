import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function activateAllBots() {
  try {
    console.log('[Script] Activation de tous les bots...');

    const result = await prisma.instance.updateMany({
      where: {
        isBotActive: false,
      },
      data: {
        isBotActive: true,
      },
    });

    console.log(`[Script] ✅ ${result.count} instance(s) mise(s) à jour`);

    const totalInstances = await prisma.instance.count();
    const activeInstances = await prisma.instance.count({
      where: { isBotActive: true },
    });

    console.log(`[Script] Total: ${totalInstances} instances`);
    console.log(`[Script] Actives: ${activeInstances} instances`);
    console.log(`[Script] ✅ Tous les bots sont maintenant actifs par défaut`);

  } catch (error) {
    console.error('[Script] Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateAllBots();
