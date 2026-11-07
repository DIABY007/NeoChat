import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { getContactsAndGroups } from '../services/evolutionInstanceService';

const router = Router();

router.get('/:instanceName', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceName } = req.params;

    console.log(`[Contacts] Demande de récupération pour l'instance ${instanceName}`);

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

    if (instance.status !== 'CONNECTED') {
      return res.status(400).json({
        success: false,
        error: 'L\'instance doit être connectée pour récupérer les contacts',
        status: instance.status,
      });
    }

    try {
      const { contacts, groups } = await getContactsAndGroups(instanceName);

      console.log(`[Contacts] ✅ ${contacts.length} contacts et ${groups.length} groupes récupérés`);

      return res.status(200).json({
        success: true,
        data: {
          contacts,
          groups,
          summary: {
            totalContacts: contacts.length,
            totalGroups: groups.length,
          },
        },
      });

    } catch (evolutionError: any) {
      console.error(`[Contacts] Erreur Evolution API:`, evolutionError.message);

      return res.status(503).json({
        success: false,
        error: 'Evolution API non disponible',
        details: process.env.NODE_ENV === 'development' ? evolutionError.message : undefined,
      });
    }

  } catch (error: any) {
    console.error('[Contacts] Erreur lors de la récupération des contacts:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.get('/:instanceName/contacts', authenticate, async (req: AuthRequest, res: Response) => {
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

    if (instance.status !== 'CONNECTED') {
      return res.status(400).json({
        success: false,
        error: 'L\'instance doit être connectée',
      });
    }

    try {
      const { contacts } = await getContactsAndGroups(instanceName);

      return res.status(200).json({
        success: true,
        data: {
          contacts,
          total: contacts.length,
        },
      });

    } catch (evolutionError: any) {
      return res.status(503).json({
        success: false,
        error: 'Evolution API non disponible',
        details: process.env.NODE_ENV === 'development' ? evolutionError.message : undefined,
      });
    }

  } catch (error: any) {
    console.error('[Contacts] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.get('/:instanceName/groups', authenticate, async (req: AuthRequest, res: Response) => {
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

    if (instance.status !== 'CONNECTED') {
      return res.status(400).json({
        success: false,
        error: 'L\'instance doit être connectée',
      });
    }

    try {
      const { groups } = await getContactsAndGroups(instanceName);

      return res.status(200).json({
        success: true,
        data: {
          groups,
          total: groups.length,
        },
      });

    } catch (evolutionError: any) {
      return res.status(503).json({
        success: false,
        error: 'Evolution API non disponible',
        details: process.env.NODE_ENV === 'development' ? evolutionError.message : undefined,
      });
    }

  } catch (error: any) {
    console.error('[Contacts] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
