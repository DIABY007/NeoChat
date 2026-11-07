import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { getContactsAndGroups } from '../services/evolutionInstanceService';

const router = Router();

// Récupérer tous les groupes d'une instance avec leur statut d'activation
router.get('/:instanceId', async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;

    const instance = await prisma.instance.findUnique({
      where: { id: instanceId },
      include: { botGroups: true },
    });

    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance non trouvée' });
    }

    // Récupérer les groupes depuis Evolution API
    const { groups: evolutionGroups } = await getContactsAndGroups(instance.instanceName);

    // Fusionner avec les données de notre base
    const groupsWithStatus = evolutionGroups.map(evoGroup => {
      const dbGroup = instance.botGroups.find(g => g.whatsappGroupId === evoGroup.id);
      return {
        id: evoGroup.id,
        name: evoGroup.subject,
        isActive: dbGroup ? dbGroup.isActive : false,
      };
    });

    return res.json({
      success: true,
      data: groupsWithStatus,
    });
  } catch (error: any) {
    console.error('[Groups] Erreur lors de la récupération des groupes:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Activer/Désactiver l'IA pour un groupe spécifique
router.post('/toggle', async (req: Request, res: Response) => {
  try {
    const { instanceId, whatsappGroupId, groupName, isActive } = req.body;

    if (!instanceId || !whatsappGroupId) {
      return res.status(400).json({ success: false, error: 'instanceId et whatsappGroupId sont requis' });
    }

    const botGroup = await prisma.botGroup.upsert({
      where: {
        instanceId_whatsappGroupId: {
          instanceId,
          whatsappGroupId,
        },
      },
      update: {
        isActive,
        groupName,
      },
      create: {
        instanceId,
        whatsappGroupId,
        groupName,
        isActive,
      },
    });

    return res.json({
      success: true,
      data: botGroup,
    });
  } catch (error: any) {
    console.error('[Groups] Erreur lors du basculement du groupe:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
