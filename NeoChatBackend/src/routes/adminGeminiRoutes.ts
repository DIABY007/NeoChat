import { Router, Response } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { authenticate, isAdmin, AuthRequest } from '../middleware/authMiddleware';
import { generateEmbedding } from '../services/knowledgeService';
import { extractTextFromPDF, cleanText } from '../lib/pdf-utils';

const router = Router();
router.use(authenticate);
router.use(isAdmin);

// ─── Configuration Gemini ──────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENROUTER_API_KEY;
const isGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || (isGemini ? 'https://generativelanguage.googleapis.com/v1beta/openai' : (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'));
const GEMINI_SCHEDULE_MODEL = process.env.GEMINI_SCHEDULE_MODEL || 'gemini-3.8-flash';

const gemini = new OpenAI({
  apiKey: GEMINI_API_KEY,
  baseURL: GEMINI_BASE_URL,
  defaultHeaders: isGemini ? undefined : {
    'HTTP-Referer': process.env.SITE_URL || 'https://neochat.pro',
    'X-Title': 'NeoChat',
  },
});

/**
 * Appelle Gemini pour l'analyse d'emploi du temps avec repli automatique en cas de surcharge (503)
 */
async function callScheduleLLM(messages: any[], maxTokens: number = 6000) {
  const model = GEMINI_SCHEDULE_MODEL;
  console.log(`[Gemini Schedule] Appel LLM avec modèle ${model}...`);
  try {
    return await gemini.chat.completions.create({
      model,
      messages,
      temperature: 0.1,
      max_tokens: maxTokens,
    });
  } catch (err: any) {
    if (model !== 'gemini-3.5-flash' && (err.status === 503 || err.message?.includes('demand') || err.message?.includes('503'))) {
      console.warn(`[Gemini Schedule] ⚠️ ${model} temporairement indisponible (503). Basculement automatique sur gemini-3.5-flash...`);
      return await gemini.chat.completions.create({
        model: 'gemini-3.5-flash',
        messages,
        temperature: 0.1,
        max_tokens: maxTokens,
      });
    }
    throw err;
  }
}

// ─── Cache session en mémoire ─────────────────────────────
interface GeminiSession {
  fileName: string;
  rawText: string;
  currentContent: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  createdAt: Date;
}
const sessions = new Map<string, GeminiSession>();

// Nettoyage automatique des sessions toutes les 30 min
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt.getTime() > 30 * 60 * 1000) sessions.delete(id);
  }
}, 30 * 60 * 1000);

// ─── Upload multer ────────────────────────────────────────
const allowedScheduleMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedScheduleMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Seuls les fichiers PDF et images (JPG, PNG, WEBP) sont acceptés'));
  },
});

// ─── 1. Lire le PDF ou l'Image avec Gemini ───────────────────
router.post('/documents/gemini-read', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'Fichier PDF ou Image requis' });

    // 1. Extraction du texte si PDF, ou direct multimodal si image
    let pdfText = '';
    if (file.mimetype === 'application/pdf') {
      try {
        const pdfData = await extractTextFromPDF(file.buffer);
        pdfText = cleanText(pdfData.text);
      } catch (extractErr: any) {
        console.warn('[Gemini] Extraction locale échouée:', extractErr.message);
      }
    }

    const promptInstruction = `Tu es un assistant qui lit des emplois du temps depuis des PDF pour les présenter à un humain.

FIDÉLITÉ STRICTE (RÈGLE LA PLUS IMPORTANTE - NE JAMAIS VIOLER) :
- Chaque matière doit rester EXACTEMENT à son jour ET son créneau horaire d'origine dans le document source.
- Il est INTERDIT de déplacer, décaler, permuter, ajouter ou supprimer une matière d'un jour ou d'un créneau.
- Tu peux TOUJOURS changer la présentation (texte lisible), mais JAMAIS le contenu ni sa position.
- Si un créneau est vide dans la source, écris "Non spécifié". N'y mets JAMAIS une matière d'un autre créneau.
- Ne déduis JAMAIS d'horaire par logique ou par répétition supposée — reproduis uniquement ce qui est écrit.

RÈGLES DE PRÉSENTATION :
1. Sort UNIQUEMENT du texte simple, lisible par un humain. Interdit les tableaux Markdown (| colonnes |) ET les emojis. Écris ligne par ligne avec des libellés en MAJUSCULES.
2. Format recommandé :
   LUNDI
   07h30 - 09h30 : Nom du cours complet (Nom Complet Enseignant, Salle)
   10h00 - 13h00 : ...
   (ligne vide entre chaque jour)

3. Utilise TOUJOURS les NOMS COMPLETS des matières et du personnel, exactement comme dans le document source. Jamais d'abréviations, d'initiales ou de troncature.
4. Si une information est ambiguë ou incertaine (ex: à quel jour appartient un devoir), indique-le clairement avec "[AMBIGU] ..." au lieu d'affirmer avec certitude.
5. N'invente AUCUNE information. Si une information est absente, écris "Non spécifié".
6. À la fin, sous "NOTES :", liste les informations complémentaires (période, devoirs, remarques) en signalant toute incertitude.

RÈGLES DE CONTACT (IMPORTANT) :
- Attribue chaque numéro de téléphone STRICTEMENT à la personne à qui il appartient dans le document source.
- Ne fusionne JAMAIS plusieurs numéros appartenant à des personnes différentes.
- Format : "FONCTION : Nom complet — Tél : +226 XX XX XX XX". Si une personne n'a pas de numéro, ne lui attribue AUCUN numéro.

RÉSUMÉ À CALCULER ET INCLURE À LA FIN :
Après l'emploi du temps détaillé, ajoute UNE SECTION "RÉSUMÉ" avec :
a) **Total heures par matière** : calcule EXACTEMENT le nombre d'heures en faisant la différence entre heure de fin et heure de début pour chaque créneau. Exemple : 10h00 - 13h00 = 3h, pas 2h. Additionne toutes les séances par matière.
b) **Salles utilisées** : liste chaque matière avec TOUTES les salles où elle se déroule (ne déduis pas qu'une seule salle pour toutes les séances).
c) **Ambiguïtés** : signale explicitement toute information contradictoire dans le document (ex: "DEVOIR 14H" écrit dans une colonne "15h-18h").
d) **Total heures semaine** : somme de toutes les heures de cours de la semaine.

Voici le document à analyser :
${pdfText ? pdfText : '(Document visuel ou scanné ci-joint)'}

Extrais-en l'emploi du temps complet avec le résumé.`;

    const userMessageContent: any[] = [
      {
        type: 'text',
        text: promptInstruction,
      },
    ];

    if (!pdfText || pdfText.length < 50) {
      console.log(`[Gemini Schedule] Fichier (${file.mimetype}) scanné / visuel détecté. Envoi direct du buffer à Gemini...`);
      const base64 = file.buffer.toString('base64');
      userMessageContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${file.mimetype};base64,${base64}`,
        },
      });
    }

    const response = await callScheduleLLM([
      {
        role: 'user',
        content: userMessageContent,
      },
    ], 6000);

    const content = response.choices[0]?.message?.content || '';

    // Calcul programmatique du résumé (fiable, pas de LLM)
    // On supprime d'abord le RÉSUMÉ de Gemini pour éviter les doublons
    const cleanContent = content.replace(/\n?RÉSUMÉ[\s\S]*$/i, '').trim();
    const summary = calculateScheduleSummary(cleanContent);
    const enrichedContent = summary ? cleanContent + '\n\n' + summary : cleanContent;

    // Créer une session
    const sessionId = uuidv4();
    sessions.set(sessionId, {
      fileName: file.originalname.replace(/\.pdf$/i, ''),
      rawText: '',
      currentContent: enrichedContent,
      history: [
        { role: 'user', content: 'Voici le PDF à analyser.' },
        { role: 'assistant', content },
      ],
      createdAt: new Date(),
    });

    console.log(`[Gemini] ✅ Session ${sessionId} créée — ${file.originalname}`);

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        content,
        fileName: file.originalname.replace(/\.pdf$/i, ''),
      },
    });
  } catch (error: any) {
    console.error('[Gemini] Erreur lecture PDF:', error);
    return res.status(500).json({ success: false, error: error.message || 'Erreur Gemini' });
  }
});

// ─── 2. Corriger avec feedback ────────────────────────────
router.post('/documents/gemini-correct', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, feedback } = req.body;
    if (!sessionId || !feedback) {
      return res.status(400).json({ success: false, error: 'sessionId et feedback requis' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session expirée ou introuvable' });
    }

    // Ajouter le feedback à l'historique
    session.history.push({ role: 'user', content: feedback });

    // Appel Gemini avec l'historique complet
    const response = await callScheduleLLM([
      {
        role: 'system',
        content: `Tu es un assistant qui formate des emplois du temps pour un lecteur humain.
L'utilisateur te donne des corrections. Tiens compte de SES CORRECTIONS pour ajuster ta version précédente.
Corrige UNIQUEMENT ce qui est demandé. Ne réinvente pas le reste. Retourne l'intégralité de l'emploi du temps à jour.

FIDÉLITÉ STRICTE (RÈGLE LA PLUS IMPORTANTE - NE JAMAIS VIOLER) :
- Chaque matière doit rester EXACTEMENT à son jour ET son créneau horaire d'origine.
- Ne déplace, décalé, permute, ajoute ni supprime AUCUNE matière d'un jour ou créneau.
- Tu peux changer la présentation, jamais la position ni le contenu.
- Un créneau vide dans la source = "Non spécifié". N'importe JAMAIS une matière d'un autre créneau.

RÈGLES DE PRÉSENTATION :
1. Texte simple lisible par un humain. JAMAIS de tableau Markdown (| colonnes |) ni d'emojis.
2. Format : "LUNDI" (en MAJUSCULES) puis "07h30 - 09h30 : Cours (Enseignant complet, Salle)" ligne par ligne.
3. Noms de cours et de personnel TOUJOURS COMPLETS, jamais tronqués.
4. Les informations ambiguës sont marquées "[AMBIGU] ...", jamais affirmées avec certitude.
5. Termine par "NOTES :" avec les compléments (période, devoirs, contacts).
6. Contacts : chaque numéro de téléphone attribué STRICTEMENT à sa personne. Ne fusionne JAMAIS deux numéros de personnes différentes.`,
      },
      ...session.history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ], 2000);

    const corrected = response.choices[0]?.message?.content || '';
    session.currentContent = corrected;
    session.history.push({ role: 'assistant', content: corrected });

    console.log(`[Gemini] ✅ Session ${sessionId} corrigée`);

    return res.status(200).json({
      success: true,
      data: { content: corrected },
    });
  } catch (error: any) {
    console.error('[Gemini] Erreur correction:', error);
    return res.status(500).json({ success: false, error: error.message || 'Erreur correction' });
  }
});

// ─── 3. Sauvegarder dans la base vectorielle ──────────────
router.post('/documents/gemini-save', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId requis' });

    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session expirée' });

    // Récupérer l'instance UAUBEN_SCHOOLL pour obtenir le userId
    const instance = await prisma.instance.findFirst({
      where: { instanceName: 'UAUBEN_SCHOOLL' },
    });
    if (!instance) return res.status(500).json({ success: false, error: 'Instance UAUBEN introuvable' });

    // Régénérer le résumé programmatique (au cas où l'utilisateur a corrigé)
    const cleanForSave = session.currentContent.replace(/\n?RÉSUMÉ[\s\S]*$/i, '').trim();
    const finalContent = cleanForSave + '\n\n' + calculateScheduleSummary(cleanForSave);

    // Générer l'embedding
    const embedding = await generateEmbedding(finalContent);
    const embeddingStr = `[${embedding.join(',')}]`;

    // Supprimer l'ancien document du même type (évite l'accumulation)
    await prisma.document.deleteMany({
      where: {
        userId: instance.userId,
        metadata: { path: ['source'], equals: 'admin-gemini' },
      },
    });

    // Stocker le nouveau dans le modèle Document via SQL brut (pgvector)
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Document" (id, "userId", content, embedding, metadata, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4::vector, $5::jsonb, NOW(), NOW())`,
      require('uuid').v4(),
      instance.userId,
      finalContent,
      embeddingStr,
      JSON.stringify({
        source: 'admin-gemini',
        fileName: session.fileName,
        uploadedAt: new Date().toISOString(),
        type: 'schedule',
      })
    );

    // Nettoyer la session
    sessions.delete(sessionId);

    console.log(`[Gemini] ✅ Document sauvegardé dans le RAG — ${session.fileName}`);

    return res.status(200).json({
      success: true,
      message: 'Emploi du temps ajouté à la base de connaissances',
    });
  } catch (error: any) {
    console.error('[Gemini] Erreur sauvegarde:', error);
    return res.status(500).json({ success: false, error: error.message || 'Erreur sauvegarde' });
  }
});

// ─── Calcul programmatique du résumé horaire ─────────────
function calculateScheduleSummary(text: string): string {
  const lines = text.split('\n');
  const subjects: Record<string, { totalMinutes: number; rooms: Set<string>; days: string[] }> = {};
  let currentDay = '';

  // Parse chaque ligne
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Détecter les jours
    const dayMatch = line.match(/^(LUNDI|MARDI|MERCREDI|JEUDI|VENDREDI|SAMEDI|DIMANCHE)$/i);
    if (dayMatch) { currentDay = dayMatch[1]; continue; }

    // Détecter les créneaux : "HHhMM - HHhMM : Matière (Enseignant, Salle)"
    const slotMatch = line.match(/^(\d{1,2})[hH](\d{2})\s*-\s*(\d{1,2})[hH](\d{2})\s*:\s*(.+?)(?:\(.*?\))?\s*$/);
    if (!slotMatch || !currentDay) continue;

    const startH = parseInt(slotMatch[1]), startM = parseInt(slotMatch[2]);
    const endH = parseInt(slotMatch[3]), endM = parseInt(slotMatch[4]);
    const fullLabel = slotMatch[5].trim();

    // Extraire la matière (avant le premier '(' si présent)
    const subject = fullLabel.replace(/\(.*$/, '').replace(/\[?NON SPÉCIFIÉ|Non spécifié|Non specifié\]?/i, '').trim();
    if (!subject || subject.length < 2) continue;

    // Extraire la salle si présente
    const roomMatch = line.match(/Salle\s+([^,)\n]+)/i);
    const room = roomMatch ? roomMatch[1].trim() : 'Non spécifiée';

    // Calculer la durée en minutes
    const duration = (endH * 60 + endM) - (startH * 60 + startM);

    // Agréger
    if (!subjects[subject]) subjects[subject] = { totalMinutes: 0, rooms: new Set(), days: [] };
    subjects[subject].totalMinutes += duration;
    subjects[subject].rooms.add(room);
    if (!subjects[subject].days.includes(currentDay)) subjects[subject].days.push(currentDay);
  }

  // Générer le texte du résumé
  if (Object.keys(subjects).length === 0) return '';

  const lines_out: string[] = [];
  lines_out.push('');
  lines_out.push('RÉSUMÉ (calculé automatiquement)');
  lines_out.push('');

  let totalWeekMinutes = 0;
  for (const [subj, data] of Object.entries(subjects)) {
    const hours = (data.totalMinutes / 60).toFixed(1).replace('.', 'h');
    const rooms = [...data.rooms].join(', ');
    const days = data.days.join(', ');
    lines_out.push(`- ${subj}: ${hours} (${days}) — Salles: ${rooms}`);
    totalWeekMinutes += data.totalMinutes;
  }

  const totalHours = (totalWeekMinutes / 60).toFixed(1).replace('.', 'h');
  lines_out.push('');
  lines_out.push(`Total heures semaine: ${totalHours}`);
  lines_out.push('');

  return lines_out.join('\n');
}

export default router;