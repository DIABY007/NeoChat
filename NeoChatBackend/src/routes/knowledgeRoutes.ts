import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { requireAssistantAccess } from '../middleware/planMiddleware';
import prisma from '../config/prisma';
import { processPDFAndStore } from '../services/knowledgeService';
import SystemMessagesService from '../services/systemMessagesService';

const router = Router();

// Configuration multer pour l'upload de fichiers
const storage = multer.memoryStorage();
const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF et images (JPG, PNG, WEBP) sont acceptés'));
    }
  },
});

router.post('/upload', authenticate, requireAssistantAccess, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez fournir un fichier PDF ou une image',
      });
    }

    if (!file.buffer) {
      console.error('[DEBUG MULTER] ❌ Buffer est undefined ou null!');
      return res.status(400).json({
        success: false,
        error: 'Multer n\'a pas intercepté le buffer du fichier',
      });
    }

    console.log('[DEBUG MULTER] ✅ Fichier intercepté par Multer');
    console.log('[DEBUG MULTER] Nom du fichier:', file.originalname, '| Type:', file.mimetype, '| Taille:', file.buffer.length);

    // Vérification basique si PDF
    if (file.mimetype === 'application/pdf') {
      const pdfHeader = file.buffer.toString('utf8', 0, 5);
      if (pdfHeader !== '%PDF-') {
        console.warn('[DEBUG MULTER] ⚠️ Header %PDF- non standard, Gemini Multimodal analysera le fichier');
      }
    }

    // Vérifier le statut de l'abonnement de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user?.subscription || !['ACTIVE', 'TRIAL'].includes(user.subscription.status)) {
      return res.status(403).json({
        success: false,
        error: 'Abonnement requis pour uploader des documents. Veuillez activer votre abonnement.',
      });
    }

    console.log(`[Knowledge] Upload pour utilisateur ${userId}: ${file.originalname} (${file.size} bytes)`);

    // Traitement du PDF : extraction, chunking, embeddings, stockage vectoriel
    let result;
    let processingSuccess = false;
    
    try {
      result = await processPDFAndStore(userId, file.buffer, file.originalname, file.mimetype);
      processingSuccess = true;
      
      // Envoyer notification de succès
      try {
        if (user?.phone) {
          await SystemMessagesService.sendKnowledgeProcessed(user.phone, file.originalname, true);
          console.log(`[Knowledge] 📱 Notification de succès envoyée à ${user.phone}`);
        }
      } catch (notifError) {
        console.error(`[Knowledge] Erreur lors de l'envoi de la notification:`, notifError);
      }

      return res.status(200).json({
        success: true,
        message: `${result.chunksCount} chunks vectorisés et stockés avec succès`,
        data: {
          fileName: file.originalname,
          fileSize: file.size,
          chunksCount: result.chunksCount,
          stats: result.stats,
          warning: result.warning,
        },
      });
    } catch (processingError: any) {
      console.error('[Knowledge] Erreur lors du traitement du PDF:', processingError);
      
      // Envoyer notification d'échec
      try {
        if (user?.phone) {
          await SystemMessagesService.sendKnowledgeProcessed(user.phone, file.originalname, false);
          console.log(`[Knowledge] 📱 Notification d'échec envoyée à ${user.phone}`);
        }
      } catch (notifError) {
        console.error(`[Knowledge] Erreur lors de l'envoi de la notification:`, notifError);
      }
      
      throw processingError;
    }
  } catch (error: any) {
    console.error('[Knowledge] Erreur lors de l\'upload:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'upload',
    });
  }
});

router.get('/documents', authenticate, requireAssistantAccess, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Récupérer les documents vectoriels (Document)
    const vectorDocuments = await prisma.document.findMany({
      where: { userId },
      select: {
        id: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Récupérer les KnowledgeDocuments liés aux instances de l'utilisateur
    const knowledgeDocuments = await prisma.knowledgeDocument.findMany({
      where: {
        instance: {
          userId,
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        instanceId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Combiner les deux types de documents
    const allDocuments = [
      ...vectorDocuments.map(doc => ({
        id: doc.id,
        name: (doc.metadata as any)?.fileName || 'Document vectoriel',
        type: 'VECTOR',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      ...knowledgeDocuments.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        instanceId: doc.instanceId,
      })),
    ];

    return res.status(200).json({
      success: true,
      data: {
        documents: allDocuments,
        count: allDocuments.length,
        vectorCount: vectorDocuments.length,
        knowledgeCount: knowledgeDocuments.length,
      },
    });
  } catch (error: any) {
    console.error('[Knowledge] Erreur lors de la récupération des documents:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
