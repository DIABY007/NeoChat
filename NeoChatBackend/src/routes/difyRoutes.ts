import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { requireAssistantAccess } from '../middleware/planMiddleware';

const router = Router();

router.post('/configure/:instanceName', authenticate, requireAssistantAccess, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { instanceName } = req.params;
    const { difyAppId } = req.body;

    if (!difyAppId) {
      return res.status(400).json({
        success: false,
        error: 'Le difyAppId est requis',
      });
    }

    console.log(`[Dify] Configuration de l'app ${difyAppId} pour l'instance ${instanceName}`);

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

    const updatedInstance = await prisma.instance.update({
      where: { id: instance.id },
      data: { difyAppId },
    });

    console.log(`[Dify] ✅ App Dify configurée pour l'instance ${instanceName}`);

    return res.status(200).json({
      success: true,
      message: 'Application Dify configurée avec succès',
      data: {
        instanceName: updatedInstance.instanceName,
        difyAppId: updatedInstance.difyAppId,
      },
    });

  } catch (error: any) {
    console.error('[Dify] Erreur lors de la configuration:', error);
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

    return res.status(200).json({
      success: true,
      data: {
        instanceName: instance.instanceName,
        difyAppId: instance.difyAppId,
        configured: !!instance.difyAppId,
      },
    });

  } catch (error: any) {
    console.error('[Dify] Erreur lors de la récupération du statut:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
