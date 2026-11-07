import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

const uploadDir = path.join(__dirname, '../../uploads/campaigns');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `campaign-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image (JPEG, PNG, GIF, WEBP) sont acceptés'));
    }
  },
});

router.post('/campaign-image', authenticate, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez fournir une image',
      });
    }

    console.log(`[Upload] Image uploadée: ${file.filename} (${file.size} bytes)`);

    const imageUrl = `/uploads/campaigns/${file.filename}`;

    return res.status(200).json({
      success: true,
      message: 'Image uploadée avec succès',
      data: {
        url: imageUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      },
    });
  } catch (error: any) {
    console.error('[Upload] Erreur lors de l\'upload:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'upload',
    });
  }
});

router.delete('/campaign-image/:filename', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Fichier non trouvé',
      });
    }

    fs.unlinkSync(filePath);

    console.log(`[Upload] Image supprimée: ${filename}`);

    return res.status(200).json({
      success: true,
      message: 'Image supprimée avec succès',
    });
  } catch (error: any) {
    console.error('[Upload] Erreur lors de la suppression:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la suppression',
    });
  }
});

export default router;
