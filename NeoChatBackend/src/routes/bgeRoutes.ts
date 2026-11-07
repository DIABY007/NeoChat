import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';
import prisma from '../config/prisma';
import { authenticate, isAdmin, AuthRequest } from '../middleware/authMiddleware';
import { extractTextFromPDF, cleanText } from '../lib/pdf-utils';

const router = Router();
router.use(authenticate);
router.use(isAdmin);

// ─── Gemini Client pour OCR / Extraction Flyer ────────────
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENROUTER_API_KEY;
const isGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const BASE_URL = process.env.GEMINI_BASE_URL || (isGemini ? 'https://generativelanguage.googleapis.com/v1beta/openai' : (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'));
const VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-3.5-flash';

const gemini = new OpenAI({
  apiKey: API_KEY,
  baseURL: BASE_URL,
});

// ─── Multer Storage ───────────────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads/bge');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `bge-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format non supporté (seuls JPG, PNG, WEBP et PDF sont acceptés)'));
  },
});

/**
 * Calcule la date d'expiration exacte
 */
function calculateExpiresAt(mode: string, customDate?: string): Date | null {
  const now = new Date();
  if (mode === '24h') {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
  if (mode === 'dimanche') {
    const d = new Date(now);
    const day = d.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    const daysUntilSunday = day === 0 ? 0 : 7 - day;
    d.setDate(d.getDate() + daysUntilSunday);
    d.setHours(23, 59, 59, 999);
    return d;
  }
  if (mode === '7j') {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  if (mode === '1mois' || mode === '1_mois' || mode === '30j') {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 1);
    return d;
  }
  if (mode === '3mois' || mode === '3_mois' || mode === '90j') {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 3);
    return d;
  }
  if (mode === 'permanent') {
    return null;
  }
  if (mode === 'custom' && customDate) {
    const parsed = new Date(customDate);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
}

/**
 * GET /api/bge/annonces
 * Liste les annonces créées (les actives en priorité)
 */
router.get('/annonces', async (req: AuthRequest, res: Response) => {
  try {
    const annonces = await prisma.annonceExpress.findMany({
      where: {
        status: 'ACTIVE',
        createdByAdmin: {
          role: 'BGE',
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        createdByAdmin: {
          select: { id: true, name: true, phoneNumber: true, role: true },
        },
      },
    });

    const now = new Date();
    const formatted = annonces.map((a) => ({
      ...a,
      isExpired: a.expiresAt ? new Date(a.expiresAt) < now : false,
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('[BGE] Erreur listing annonces:', error);
    return res.status(500).json({ success: false, error: 'Erreur récupération annonces' });
  }
});

/**
 * POST /api/bge/annonces
 * Publie une annonce ou un événement BGE
 */
router.post('/annonces', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const admin = (req as any).admin;
    const { title, type, expirationMode, customExpiresAt, message: rawMessage } = req.body;

    let message = (rawMessage || '').trim();
    let fileUrl: string | null = null;

    if (req.file) {
      fileUrl = `/uploads/bge/${req.file.filename}`;
      const filePath = req.file.path;
      const fileBuffer = fs.readFileSync(filePath);

      // Extraction intelligente selon le type de fichier
      if (req.file.mimetype === 'application/pdf') {
        let pdfText = '';
        try {
          const pdfData = await extractTextFromPDF(fileBuffer);
          pdfText = cleanText(pdfData.text);
        } catch (pdfErr: any) {
          console.warn('[BGE] Échec extraction PDF locale:', pdfErr.message);
        }

        // Si le texte extrait est suffisant (> 100 car.), c'est un PDF numérique natif
        if (pdfText && pdfText.length >= 100) {
          console.log(`[BGE] Texte extrait du PDF numérique (${pdfText.length} car.)`);
          message = message ? `${message}\n\n[Contenu du document PDF] :\n${pdfText}` : pdfText;
        } else {
          // Sinon (PDF scanné, note officielle avec sceau/signature sous forme d'image), on utilise Gemini Vision / Multimodal
          try {
            console.log('[BGE] PDF scanné ou image détecté. Analyse directe par Gemini Multimodal...');
            const base64 = fileBuffer.toString('base64');
            const aiRes = await gemini.chat.completions.create({
              model: VISION_MODEL,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `Tu es un assistant universitaire chargé d'extraire les informations d'un communiqué, arrêté ou document officiel de l'Université Aube Nouvelle (UAUBEN).
Extrais fidèlement toutes les informations clés du document :
- Objet / Titre du document
- Décisions, mesures ou règles annoncées
- Dates limites, échéances, délais et reports
- Cycles, promotions ou filières concernés (Licence, Master, etc.)
- Sanctions ou conséquences en cas de non-respect
- Signataire, date et lieu du communiqué

Formate le résultat sous forme de texte clair, structuré et précis en français.`,
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:application/pdf;base64,${base64}`,
                      },
                    },
                  ],
                },
              ],
              temperature: 0.1,
              max_tokens: 2000,
            });

            const extractedText = aiRes.choices[0]?.message?.content?.trim();
            if (extractedText) {
              console.log('[BGE] ✅ Analyse PDF scanné par Gemini réussie');
              message = message ? `${message}\n\n[Contenu officiel extrait du PDF] :\n${extractedText}` : extractedText;
            } else if (pdfText) {
              message = message ? `${message}\n\n[Contenu du document PDF] :\n${pdfText}` : pdfText;
            }
          } catch (geminiPdfErr: any) {
            console.warn('[BGE] Échec analyse PDF par Gemini:', geminiPdfErr.message);
            if (pdfText) {
              message = message ? `${message}\n\n[Contenu du document PDF] :\n${pdfText}` : pdfText;
            }
          }
        }
      } else if (req.file.mimetype.startsWith('image/')) {
        try {
          console.log(`[BGE] Analyse de l'affiche image avec Gemini Vision (${req.file.mimetype})...`);
          const base64 = fileBuffer.toString('base64');
          const aiRes = await gemini.chat.completions.create({
            model: VISION_MODEL,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Tu es un assistant qui extrait les informations d'une affiche d'événement ou communiqué étudiant.
Extrais les éléments textuels de manière claire et fidèle :
- Titre / Objet
- Date, Heure et Lieu
- Tarifs / Modalités de participation
- Contacts ou inscriptions
- Programme et points clés

Résume ces informations en français sous forme de texte clair et lisible.`,
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${req.file.mimetype};base64,${base64}`,
                    },
                  },
                ],
              },
            ],
            temperature: 0.1,
            max_tokens: 1000,
          });

          const extractedVision = aiRes.choices[0]?.message?.content?.trim();
          if (extractedVision) {
            console.log('[BGE] ✅ Analyse image réussie');
            message = message
              ? `${message}\n\n[Détails extraits de l'affiche] :\n${extractedVision}`
              : extractedVision;
          }
        } catch (visionErr: any) {
          console.warn('[BGE] Échec analyse image Gemini Vision:', visionErr.message);
        }
      }
    }

    if (!message && !title) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez renseigner au moins un titre ou un message/fichier',
      });
    }

    const expiresAt = calculateExpiresAt(expirationMode || '7j', customExpiresAt);

    const annonce = await prisma.annonceExpress.create({
      data: {
        title: title ? title.trim() : null,
        type: type === 'EVENEMENT' ? 'EVENEMENT' : 'ANNONCE',
        message: message || title || 'Information BGE',
        fileUrl,
        expiresAt,
        status: 'ACTIVE',
        createdBy: admin.id,
      },
      include: {
        createdByAdmin: {
          select: { name: true, phoneNumber: true, role: true },
        },
      },
    });

    console.log(`[BGE] ✅ Annonce créée: "${annonce.title || 'Sans titre'}" par ${admin.name || admin.phoneNumber} (${annonce.type}) - Expire: ${expiresAt ? expiresAt.toISOString() : 'Jamais'}`);

    return res.status(201).json({
      success: true,
      message: 'Annonce publiée avec succès et injectée dans le bot !',
      data: annonce,
    });
  } catch (error: any) {
    console.error('[BGE] Erreur publication annonce:', error);
    return res.status(500).json({ success: false, error: error.message || 'Erreur publication' });
  }
});

/**
 * DELETE /api/bge/annonces/:id
 * Supprime ou archive une annonce
 */
router.delete('/annonces/:id', async (req: AuthRequest, res: Response) => {
  try {
    const admin = (req as any).admin;
    const { id } = req.params;

    const existing = await prisma.annonceExpress.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Annonce introuvable' });
    }

    // Seul le créateur ou un SUPER_ADMIN peut supprimer
    if (admin.role !== 'SUPER_ADMIN' && existing.createdBy !== admin.id) {
      return res.status(403).json({ success: false, error: 'Action non autorisée' });
    }

    await prisma.annonceExpress.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    console.log(`[BGE] 🗑️ Annonce ${id} archivée par ${admin.phoneNumber}`);

    return res.status(200).json({ success: true, message: 'Annonce archivée' });
  } catch (error: any) {
    console.error('[BGE] Erreur suppression annonce:', error);
    return res.status(500).json({ success: false, error: 'Erreur suppression' });
  }
});

export default router;
