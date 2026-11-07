/**
 * Wrapper intelligent pour l'extraction de documents (PDF et Images)
 * Utilise pdf-parse pour le texte vectoriel rapide et bascule automatiquement
 * sur Google Gemini Multimodal pour l'OCR des PDF scannés et des images.
 */
import OpenAI from 'openai';

let pdfParseFunction: any = null;

function loadPdfParse() {
  if (pdfParseFunction) return pdfParseFunction;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    pdfParseFunction = pdfParse.default || pdfParse;
    return pdfParseFunction;
  } catch (error: any) {
    if (error.code === 'ENOENT' && error.path?.includes('test/data')) {
      console.warn('[PDF] Fichiers de test manquants ignorés.');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      pdfParseFunction = pdfParse.default || pdfParse;
      return pdfParseFunction;
    }
    throw error;
  }
}

let geminiClient: OpenAI | null = null;

function getGeminiClient(): OpenAI | null {
  if (geminiClient) return geminiClient;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const isGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const baseURL =
    process.env.GEMINI_BASE_URL ||
    (isGemini
      ? 'https://generativelanguage.googleapis.com/v1beta/openai'
      : process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1');

  geminiClient = new OpenAI({
    apiKey,
    baseURL,
  });
  return geminiClient;
}

/**
 * Extrait tout le texte et contenu d'un PDF ou d'une Image grâce à Gemini Multimodal / Vision
 */
export async function extractTextWithGemini(
  buffer: Buffer,
  mimeType: string,
  customPrompt?: string
): Promise<string> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini API non configurée pour l\'extraction multimodale');
  }

  const model = process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const promptText =
    customPrompt ||
    `Tu es un assistant universitaire et bureautique de haute précision spécialisé dans la transcription et l'OCR de documents, affiches, communiqués, arrêtés, emplois du temps et fichiers académiques.
Extrais et retranscris fidèlement l'intégralité du texte contenu dans ce fichier, sans rien omettre et sans rien inventer :
- Conserve les titres, sections, dates, heures, lieux, tableaux, tarifs, numéros et contacts.
- Si le document contient des tableaux ou des listes, présente-les sous forme de texte clair et structuré.
- Ne fais aucun commentaire méta, donne directement le contenu fidèlement transcrit en français.`;

  console.log(`[Gemini Multimodal] Extraction de ${mimeType} (${Math.round(buffer.length / 1024)} Ko) avec ${model}...`);

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content?.trim() || '';
  console.log(`[Gemini Multimodal] ✅ Extraction réussie: ${content.length} caractères extraits`);
  return content;
}

/**
 * Extraction intelligente d'un PDF :
 * 1. Tente d'abord une lecture numérique locale rapide
 * 2. Si le texte est vide ou scanné (< 100 car.), bascule automatiquement sur Gemini Multimodal
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<{
  text: string;
  numpages: number;
  info: any;
}> {
  let localText = '';
  let numpages = 1;

  // 1. Essai d'extraction numérique rapide locale via pdf-parse
  try {
    const parse = loadPdfParse();
    if (typeof parse === 'function') {
      const data = await parse(buffer);
      if (data && data.text) {
        localText = data.text.trim();
        numpages = data.numpages || 1;
      }
    }
  } catch (err: any) {
    console.warn('[PDF] Extraction locale pdf-parse a échoué ou document non vectoriel:', err.message);
  }

  // 2. Si le texte extrait est suffisant (> 100 caractères), on le retourne
  if (localText && localText.length >= 100) {
    console.log(`[PDF] Extraction locale réussie: ${numpages} pages, ${localText.length} caractères`);
    return {
      text: localText,
      numpages,
      info: {},
    };
  }

  // 3. Sinon (PDF scanné, image insérée, scan de note administrative, ou pdf-parse vide),
  // on utilise directement Gemini Multimodal Vision !
  console.log('[PDF] ⚠️ Texte local insuffisant ou PDF scanné. Basculement automatique vers Gemini Multimodal...');
  try {
    const geminiText = await extractTextWithGemini(buffer, 'application/pdf');
    if (geminiText) {
      return {
        text: geminiText,
        numpages: numpages || 1,
        info: { engine: 'gemini-multimodal' },
      };
    }
  } catch (geminiErr: any) {
    console.error('[PDF] Erreur Gemini Multimodal:', geminiErr.message);
    if (localText) {
      return {
        text: localText,
        numpages,
        info: {},
      };
    }
    throw new Error(`Impossible d'extraire le texte du PDF (Échec Gemini: ${geminiErr.message})`);
  }

  return {
    text: localText,
    numpages,
    info: {},
  };
}

/**
 * Nettoie le texte extrait d'un document
 */
export function cleanText(text: string): string {
  if (!text) return '';

  // 1. Suppression espaces multiples → espace unique
  let cleaned = text.replace(/\s+/g, ' ');

  // 2. Réduction sauts de ligne (max 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 3. Suppression caractères de contrôle (sauf \n, \r, \t)
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return cleaned.trim();
}

/**
 * Détecte si un PDF est basé sur des images (scanné)
 */
export function detectImageBasedPDF(text: string): boolean {
  if (!text || text.length < 100) return true;
  const estimatedPages = Math.max(1, Math.ceil(text.length / 2000));
  const charsPerPage = text.length / estimatedPages;
  if (charsPerPage < 50) return true;
  const printableChars = text.replace(/[\s\n\r\t]/g, '').length;
  const printableRatio = printableChars / Math.max(1, text.length);
  return printableRatio < 0.3;
}

/**
 * Calcule le hash SHA-256 d'un buffer
 */
export function calculateHash(buffer: Buffer): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
