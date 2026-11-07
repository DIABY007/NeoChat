/**
 * Service de gestion de la base de connaissances RAG
 * Adapté de NeoWhatAI pour NeoChat
 */

import { OpenAI } from 'openai';
import prisma from '../config/prisma';
import { extractTextFromPDF, cleanText, detectImageBasedPDF, extractTextWithGemini } from '../lib/pdf-utils';
import { chunkTextByTokens, getTextStats, TextChunk } from '../lib/chunking';

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENROUTER_API_KEY;
const isGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const BASE_URL = process.env.GEMINI_BASE_URL || (isGemini ? 'https://generativelanguage.googleapis.com/v1beta/openai' : (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'));
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || (isGemini ? 'gemini-embedding-001' : 'openai/text-embedding-3-small');
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const SITE_NAME = process.env.SITE_NAME || 'NeoChat';

if (!API_KEY) {
  console.warn('[Knowledge] ⚠️ GEMINI_API_KEY (ou OPENROUTER_API_KEY) requis dans .env pour la vectorisation');
}

const aiClient = new OpenAI({
  apiKey: API_KEY,
  baseURL: BASE_URL,
  defaultHeaders: isGemini ? undefined : {
    'HTTP-Referer': SITE_URL,
    'X-Title': SITE_NAME,
  },
});

/**
 * Génère un embedding pour un texte via Gemini (ou OpenRouter fallback)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!API_KEY) {
    throw new Error('Clé API non configurée (GEMINI_API_KEY ou OPENROUTER_API_KEY requise)');
  }

  try {
    const params: any = {
      model: EMBEDDING_MODEL,
      input: text,
    };
    // Google Gemini embedding models support output dimensions (1536 matches pgvector schema)
    if (isGemini || EMBEDDING_MODEL.includes('gemini') || EMBEDDING_MODEL.includes('text-embedding-3')) {
      params.dimensions = 1536;
    }

    const response = await aiClient.embeddings.create(params);

    return response.data[0].embedding;
  } catch (error: any) {
    console.error('[AI Embedding] Erreur lors de la génération de l\'embedding:', error.message);
    throw new Error(`Impossible de générer l'embedding: ${error.message}`);
  }
}

/**
 * Traite un PDF et stocke les chunks vectorisés en base
 */
export async function processPDFAndStore(
  userId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = 'application/pdf'
): Promise<{
  success: boolean;
  chunksCount: number;
  stats: any;
  warning?: string;
}> {
  console.log(`[Knowledge] Traitement du document (${mimeType}) pour utilisateur ${userId}: ${fileName}`);

  // 1. Extraction du texte via Gemini pour images ou hybride pour PDF
  let text = '';
  let numpages = 1;

  if (mimeType.startsWith('image/')) {
    console.log(`[Knowledge] Analyse de l'image avec Gemini Vision (${mimeType})...`);
    text = await extractTextWithGemini(fileBuffer, mimeType);
  } else {
    const pdfData = await extractTextFromPDF(fileBuffer);
    text = pdfData.text;
    numpages = pdfData.numpages;
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Le document ou l\'image ne contient pas de texte extractible');
  }

  console.log(`[Knowledge] Texte extrait: ${text.length} caractères, ${numpages} pages`);

  // 2. Nettoyage du texte
  text = cleanText(text);

  // 3. Détection PDF scanné (warning)
  const isImageBased = detectImageBasedPDF(text);
  let warning: string | undefined;
  if (isImageBased) {
    warning = 'Le PDF semble être scanné. La qualité de l\'extraction peut être limitée. Considérez l\'utilisation d\'un OCR.';
    console.warn(`[Knowledge] ⚠️ ${warning}`);
  }

  // 4. Statistiques du texte
  const stats = getTextStats(text);
  console.log(`[Knowledge] Stats: ${stats.totalWords} mots, ${stats.totalChars} caractères, ~${stats.estimatedTokens} tokens`);

  // 5. Chunking intelligent
  const chunks = chunkTextByTokens(text);
  console.log(`[Knowledge] ${chunks.length} chunks créés`);

  if (chunks.length === 0) {
    throw new Error('Aucun chunk créé après le traitement');
  }

  // 6. Suppression des anciens documents de l'utilisateur
  const deletedCount = await prisma.document.deleteMany({
    where: { userId },
  });
  console.log(`[Knowledge] ${deletedCount.count} anciens documents supprimés`);

  // 7. Génération des embeddings et insertion en base
  const documents: any[] = [];
  let processedChunks = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      // Génération de l'embedding
      console.log(`[Knowledge] Génération embedding ${i + 1}/${chunks.length}...`);
      const embedding = await generateEmbedding(chunk.text);

      // Préparation du document
      documents.push({
        userId,
        content: chunk.text,
        embedding: `[${embedding.join(',')}]`, // Format PostgreSQL vector
        metadata: {
          source: fileName,
          chunk_index: chunk.index,
          total_chunks: chunks.length,
          start_word: chunk.startWord,
          end_word: chunk.endWord,
          estimated_tokens: chunk.estimatedTokens,
        },
      });

      processedChunks++;

      // Rate limiting: pause toutes les 10 requêtes
      if ((i + 1) % 10 === 0 && i + 1 < chunks.length) {
        console.log(`[Knowledge] Pause rate limiting (${i + 1}/${chunks.length})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`[Knowledge] Erreur chunk ${i}:`, error.message);
      // Continue avec les autres chunks
    }
  }

  if (documents.length === 0) {
    throw new Error('Aucun embedding généré avec succès');
  }

  // 8. Insertion en batch dans PostgreSQL
  console.log(`[Knowledge] Insertion de ${documents.length} documents en base...`);
  
  for (const doc of documents) {
    await prisma.$executeRaw`
      INSERT INTO "Document" (id, "userId", content, embedding, metadata, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        ${doc.userId}::text,
        ${doc.content}::text,
        ${doc.embedding}::vector,
        ${JSON.stringify(doc.metadata)}::jsonb,
        NOW(),
        NOW()
      )
    `;
  }

  console.log(`[Knowledge] ✅ ${documents.length} documents insérés avec succès`);

  return {
    success: true,
    chunksCount: documents.length,
    stats: {
      ...stats,
      chunksCreated: chunks.length,
      chunksProcessed: processedChunks,
      pdfPages: numpages,
    },
    warning,
  };
}

/**
 * Traite un texte et le stocke vectorisé pour un bot WhatsApp
 */
export async function processTextAndStoreForBot(
  instanceId: string,
  textContent: string,
  documentName: string
): Promise<{
  success: boolean;
  chunksCount: number;
  stats: any;
}> {
  console.log(`[BotKnowledge] Traitement du texte pour instance ${instanceId}: ${documentName}`);

  // 1. Nettoyage du texte
  const cleanedText = cleanText(textContent);

  if (!cleanedText || cleanedText.trim().length === 0) {
    throw new Error('Le texte ne contient pas de contenu valide');
  }

  // 2. Statistiques du texte
  const stats = getTextStats(cleanedText);
  console.log(`[BotKnowledge] Stats: ${stats.totalWords} mots, ${stats.totalChars} caractères, ~${stats.estimatedTokens} tokens`);

  // 3. Chunking intelligent
  const chunks = chunkTextByTokens(cleanedText);
  console.log(`[BotKnowledge] ${chunks.length} chunks créés`);

  if (chunks.length === 0) {
    throw new Error('Aucun chunk créé après le traitement');
  }

  // 4. Génération des embeddings et stockage
  const embeddings: number[][] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      console.log(`[BotKnowledge] Génération embedding ${i + 1}/${chunks.length}...`);
      const embedding = await generateEmbedding(chunk.text);
      embeddings.push(embedding);

      // Rate limiting
      if ((i + 1) % 10 === 0 && i + 1 < chunks.length) {
        console.log(`[BotKnowledge] Pause rate limiting (${i + 1}/${chunks.length})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`[BotKnowledge] Erreur chunk ${i}:`, error.message);
      throw error;
    }
  }

  // 5. Stockage dans KnowledgeDocument avec embeddings
  const embeddingsJson = JSON.stringify({
    chunks: chunks.map((chunk, i) => ({
      text: chunk.text,
      embedding: embeddings[i],
      index: chunk.index,
      startWord: chunk.startWord,
      endWord: chunk.endWord,
      estimatedTokens: chunk.estimatedTokens,
    })),
  });

  const document = await prisma.knowledgeDocument.create({
    data: {
      instanceId,
      name: documentName,
      type: 'TEXT',
      content: embeddingsJson,
    },
  });

  console.log(`[BotKnowledge] ✅ Document texte vectorisé créé: ${document.id}`);

  return {
    success: true,
    chunksCount: chunks.length,
    stats,
  };
}

/**
 * Traite un PDF et le stocke vectorisé pour un bot WhatsApp
 */
export async function processPDFAndStoreForBot(
  instanceId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = 'application/pdf'
): Promise<{
  success: boolean;
  chunksCount: number;
  stats: any;
  warning?: string;
}> {
  console.log(`[BotKnowledge] Traitement du document (${mimeType}) pour instance ${instanceId}: ${fileName}`);

  // 1. Extraction du texte via Gemini pour images ou hybride pour PDF
  let text = '';
  let numpages = 1;

  if (mimeType.startsWith('image/')) {
    console.log(`[BotKnowledge] Analyse de l'image avec Gemini Vision (${mimeType})...`);
    text = await extractTextWithGemini(fileBuffer, mimeType);
  } else {
    const pdfData = await extractTextFromPDF(fileBuffer);
    text = pdfData.text;
    numpages = pdfData.numpages;
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Le document ou l\'image ne contient pas de texte extractible');
  }

  console.log(`[BotKnowledge] Texte extrait: ${text.length} caractères, ${numpages} pages`);

  // 2. Nettoyage du texte
  text = cleanText(text);

  // 3. Détection PDF scanné (warning)
  const isImageBased = detectImageBasedPDF(text);
  let warning: string | undefined;
  if (isImageBased) {
    warning = 'Le PDF semble être scanné. La qualité de l\'extraction peut être limitée. Considérez l\'utilisation d\'un OCR.';
    console.warn(`[BotKnowledge] ⚠️ ${warning}`);
  }

  // 4. Statistiques du texte
  const stats = getTextStats(text);
  console.log(`[BotKnowledge] Stats: ${stats.totalWords} mots, ${stats.totalChars} caractères, ~${stats.estimatedTokens} tokens`);

  // 5. Chunking intelligent
  const chunks = chunkTextByTokens(text);
  console.log(`[BotKnowledge] ${chunks.length} chunks créés`);

  if (chunks.length === 0) {
    throw new Error('Aucun chunk créé après le traitement');
  }

  // 6. Génération des embeddings
  const embeddings: number[][] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      console.log(`[BotKnowledge] Génération embedding ${i + 1}/${chunks.length}...`);
      const embedding = await generateEmbedding(chunk.text);
      embeddings.push(embedding);

      // Rate limiting
      if ((i + 1) % 10 === 0 && i + 1 < chunks.length) {
        console.log(`[BotKnowledge] Pause rate limiting (${i + 1}/${chunks.length})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`[BotKnowledge] Erreur chunk ${i}:`, error.message);
      throw error;
    }
  }

  // 7. Stockage dans KnowledgeDocument avec embeddings
  const embeddingsJson = JSON.stringify({
    chunks: chunks.map((chunk, i) => ({
      text: chunk.text,
      embedding: embeddings[i],
      index: chunk.index,
      startWord: chunk.startWord,
      endWord: chunk.endWord,
      estimatedTokens: chunk.estimatedTokens,
    })),
    metadata: {
      source: fileName,
      pdfPages: numpages,
    },
  });

  const document = await prisma.knowledgeDocument.create({
    data: {
      instanceId,
      name: fileName,
      type: 'PDF',
      content: embeddingsJson,
    },
  });

  console.log(`[BotKnowledge] ✅ Document PDF vectorisé créé: ${document.id}`);

  return {
    success: true,
    chunksCount: chunks.length,
    stats: {
      ...stats,
      chunksCreated: chunks.length,
      pdfPages: numpages,
    },
    warning,
  };
}

/**
 * Recherche vectorielle dans la base de connaissances d'un utilisateur
 */
export async function searchKnowledge(
  userId: string,
  query: string,
  threshold: number = 0.7,
  limit: number = 3
): Promise<Array<{ content: string; similarity: number; metadata: any }>> {
  console.log(`[Knowledge] Recherche pour utilisateur ${userId}: "${query}"`);

  // 1. Générer l'embedding de la requête
  const queryEmbedding = await generateEmbedding(query);

  // 2. Recherche vectorielle avec similarité cosine
  const results = await prisma.$queryRaw<Array<{
    id: string;
    content: string;
    metadata: any;
    similarity: number;
  }>>`
    SELECT
      id,
      content,
      metadata,
      1 - (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) AS similarity
    FROM "Document"
    WHERE "userId" = ${userId}::text
      AND embedding IS NOT NULL
      AND 1 - (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) > ${threshold}
    ORDER BY embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector
    LIMIT ${limit}
  `;

  console.log(`[Knowledge] ${results.length} résultats trouvés`);

  return results;
}
