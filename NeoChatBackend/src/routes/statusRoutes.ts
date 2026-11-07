import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { checkSubscriptionStatus } from '../middleware/subscriptionMiddleware';
import { requireBroadcastAccess } from '../middleware/planMiddleware';
import { statusQueue } from '../queues/statusQueue';

const router = Router();

// --- Upload config for status media ---
const uploadDir = path.join(__dirname, '../../uploads/status');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `status-${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'video/mp4',
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formats acceptés : .jpg, .jpeg, .png, .mp4 (max 10 Mo)'));
    }
  },
});

// ==========================================
// POST /api/status/schedule
// ==========================================
router.post(
  '/schedule',
  authenticate,
  checkSubscriptionStatus,
  requireBroadcastAccess,
  upload.single('media'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { type, content, caption, backgroundColor, scheduledAt, instanceId } = req.body;

      // --- Validation ---
      if (!type || !scheduledAt || !instanceId) {
        return res.status(400).json({
          success: false,
          error: 'Champs requis : type, scheduledAt, instanceId',
        });
      }

      const validTypes = ['TEXT', 'IMAGE', 'VIDEO'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Type invalide. Valeurs acceptées : TEXT, IMAGE, VIDEO',
        });
      }

      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'La date de programmation doit être dans le futur',
        });
      }

      // Vérifier que l'instance appartient à l'utilisateur
      const instance = await prisma.instance.findFirst({
        where: { id: instanceId, userId },
      });

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Instance non trouvée',
        });
      }

      let statusContent = '';
      let localFilePath: string | null = null;

      if (type === 'TEXT') {
        if (!content || content.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Le contenu texte est requis pour un statut de type TEXT',
          });
        }
        statusContent = content;
      } else {
        // IMAGE ou VIDEO — un fichier est requis
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'Un fichier média est requis pour un statut de type IMAGE ou VIDEO',
          });
        }

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        localFilePath = req.file.path;
        statusContent = `${backendUrl}/uploads/status/${req.file.filename}`;
      }

      // --- Créer l'entrée en base ---
      const scheduledStatus = await prisma.scheduledStatus.create({
        data: {
          instanceId,
          userId,
          type: type as 'TEXT' | 'IMAGE' | 'VIDEO',
          content: statusContent,
          localFilePath,
          caption: caption || null,
          backgroundColor: backgroundColor || null,
          scheduledAt: scheduledDate,
          status: 'PENDING',
        },
      });

      // --- Ajouter un job BullMQ avec delay ---
      const delay = scheduledDate.getTime() - Date.now();
      await statusQueue.add(
        'publish-status',
        { scheduledStatusId: scheduledStatus.id },
        { delay: Math.max(delay, 0), jobId: `status-${scheduledStatus.id}` }
      );

      console.log(`[Status] ✅ Statut programmé: ${scheduledStatus.id} pour ${scheduledDate.toISOString()} (delay: ${Math.round(delay / 1000)}s)`);

      return res.status(201).json({
        success: true,
        message: 'Statut programmé avec succès',
        data: {
          scheduledStatus: {
            id: scheduledStatus.id,
            type: scheduledStatus.type,
            scheduledAt: scheduledStatus.scheduledAt,
            status: scheduledStatus.status,
          },
        },
      });
    } catch (error: any) {
      console.error('[Status] Erreur lors de la programmation:', error);

      // Si multer error
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'Le fichier dépasse la taille maximale de 10 Mo',
        });
      }

      return res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la programmation du statut',
      });
    }
  }
);

// ==========================================
// GET /api/status/list
// ==========================================
router.get('/list', authenticate, requireBroadcastAccess, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const statuses = await prisma.scheduledStatus.findMany({
      where: { userId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        instance: { select: { instanceName: true, status: true } },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        statuses: statuses.map((s) => ({
          id: s.id,
          type: s.type,
          content: s.type === 'TEXT' ? s.content : undefined,
          caption: s.caption,
          backgroundColor: s.backgroundColor,
          scheduledAt: s.scheduledAt,
          status: s.status,
          instanceName: s.instance.instanceName,
          instanceStatus: s.instance.status,
          createdAt: s.createdAt,
        })),
        total: statuses.length,
      },
    });
  } catch (error: any) {
    console.error('[Status] Erreur lors de la récupération:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statuts',
    });
  }
});

// ==========================================
// DELETE /api/status/:id
// ==========================================
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const scheduledStatus = await prisma.scheduledStatus.findFirst({
      where: { id, userId },
    });

    if (!scheduledStatus) {
      return res.status(404).json({ success: false, error: 'Statut non trouvé' });
    }

    if (scheduledStatus.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Seuls les statuts en attente peuvent être supprimés',
      });
    }

    // Supprimer le fichier du disque si présent
    if (scheduledStatus.localFilePath) {
      try {
        fs.unlinkSync(scheduledStatus.localFilePath);
        console.log(`[Status] Fichier supprimé: ${scheduledStatus.localFilePath}`);
      } catch (e) {
        console.warn(`[Status] Fichier introuvable lors de la suppression: ${scheduledStatus.localFilePath}`);
      }
    }

    await prisma.scheduledStatus.delete({ where: { id } });

    console.log(`[Status] ✅ Statut supprimé: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Statut supprimé avec succès',
    });
  } catch (error: any) {
    console.error('[Status] Erreur lors de la suppression:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression',
    });
  }
});

export default router;
