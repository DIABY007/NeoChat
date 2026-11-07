import OpenAI from 'openai';
import { searchKnowledge, generateEmbedding } from './knowledgeService';

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENROUTER_API_KEY;
const isGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const BASE_URL = process.env.GEMINI_BASE_URL || (isGemini ? 'https://generativelanguage.googleapis.com/v1beta/openai' : (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'));
const AI_MODEL = process.env.GEMINI_MODEL || (isGemini ? 'gemini-3.1-flash-lite' : (process.env.OPENROUTER_MODEL || 'gemini-3.1-flash-lite'));
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const SITE_NAME = process.env.SITE_NAME || 'NeoChat';

if (!API_KEY) {
  console.warn('[AI Service] ⚠️ GEMINI_API_KEY (ou OPENROUTER_API_KEY) requis dans .env pour le RAG');
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
 * Récupère le contexte pertinent depuis la base de connaissances
 */
export async function getRelevantContext(
  query: string,
  userId: string,
  threshold: number = 0.3,
  limit: number = 5
): Promise<{ context: string; sources: Array<{ content: string; similarity: number }> }> {
  console.log(`[AI Service] Recherche de contexte pour: "${query}"`);

  // Recherche vectorielle dans la base de connaissances
  const results = await searchKnowledge(userId, query, threshold, limit);

  if (results.length === 0) {
    console.log('[AI Service] Aucun contexte pertinent trouvé');
    return {
      context: '',
      sources: [],
    };
  }

  // Construire le contexte à partir des chunks trouvés
  const context = results
    .map((result, index) => {
      return `[Source ${index + 1}] (Similarité: ${(result.similarity * 100).toFixed(1)}%)\n${result.content}`;
    })
    .join('\n\n---\n\n');

  console.log(`[AI Service] ${results.length} sources trouvées, contexte de ${context.length} caractères`);

  return {
    context,
    sources: results.map(r => ({ content: r.content, similarity: r.similarity })),
  };
}

/**
 * Génère une réponse AI en utilisant le contexte fourni
 */
export async function generateAIResponse(
  context: string,
  question: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  customSystemPrompt?: string
): Promise<string> {
  if (!API_KEY) {
    throw new Error('Clé API IA non configurée (GEMINI_API_KEY ou OPENROUTER_API_KEY requise)');
  }

  console.log(`[AI Service] Génération de réponse avec ${AI_MODEL} pour: "${question}"`);

  const systemPrompt = `Tu es un assistant virtuel intelligent et serviable.

RÈGLES IMPORTANTES :
1. Utilise UNIQUEMENT les informations présentes dans le CONTEXTE ci-dessous pour répondre.
2. Le contexte peut contenir des informations sur ton identité, ta personnalité, et des connaissances factuelles.
3. Si une information n'est PAS dans le contexte, dis poliment que tu n'as pas l'information pour le moment, mais précise bien qu'un administrateur a été notifié et reviendra vers lui très rapidement.
4. Ne jamais inventer ou déduire des informations qui ne sont pas explicitement dans le contexte.
5. Sois concis, clair et professionnel.

CONTEXTE :
${context || 'Aucun contexte disponible.'}

---

Réponds maintenant à la question de l'utilisateur en utilisant uniquement le contexte fourni. Si tu ne sais pas, n'oublie pas de mentionner qu'un admin va le contacter car tu l'as notifié.`;

  try {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // Fenêtre glissante : les 10 derniers messages
      { role: 'user', content: question },
    ];

    console.log("🎯 PAYLOAD ENVOYÉ AU LLM :", JSON.stringify(messages, null, 2));

    const response = await aiClient.chat.completions.create({
      model: AI_MODEL,
      messages,
      temperature: 0.3, // Température basse pour des réponses plus précises
      max_tokens: 500,
    });

    const answer = response.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.';

    console.log(`[AI Service] Réponse générée: ${answer.substring(0, 100)}...`);

    return answer;
  } catch (error: any) {
    console.error('[AI Service] Erreur lors de la génération:', error.message);
    throw new Error(`Impossible de générer une réponse: ${error.message}`);
  }
}

/**
 * Recherche sémantique dans les KnowledgeDocuments vectorisés
 */
export async function searchKnowledgeDocuments(
  query: string,
  knowledgeDocs: Array<{ id: string; name: string; type: string; content: string }>,
  threshold: number = 0.3,
  limit: number = 5
): Promise<Array<{ text: string; similarity: number; source: string }>> {
  console.log(`[AI Service] Recherche dans ${knowledgeDocs.length} KnowledgeDocuments`);

  if (knowledgeDocs.length === 0) {
    return [];
  }

  try {
    // Générer l'embedding de la requête
    const queryEmbedding = await generateEmbedding(query);

    // Extraire tous les chunks avec leurs embeddings
    const allChunks: Array<{
      text: string;
      embedding: number[];
      source: string;
    }> = [];

    for (const doc of knowledgeDocs) {
      try {
        const parsedContent = JSON.parse(doc.content);
        
        if (parsedContent.chunks && Array.isArray(parsedContent.chunks)) {
          for (const chunk of parsedContent.chunks) {
            if (chunk.text && chunk.embedding) {
              allChunks.push({
                text: chunk.text,
                embedding: chunk.embedding,
                source: doc.name,
              });
            }
          }
        }
      } catch (parseError) {
        console.error(`[AI Service] Erreur parsing document ${doc.name}:`, parseError);
      }
    }

    console.log(`[AI Service] ${allChunks.length} chunks extraits des documents`);

    if (allChunks.length === 0) {
      return [];
    }

    // Calculer la similarité cosine pour chaque chunk
    const results = allChunks.map(chunk => {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        text: chunk.text,
        similarity,
        source: chunk.source,
      };
    });

    // Filtrer par seuil et trier par similarité
    const filteredResults = results
      .filter(r => r.similarity > threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    console.log(`[AI Service] ${filteredResults.length} chunks pertinents trouvés`);

    return filteredResults;
  } catch (error: any) {
    console.error('[AI Service] Erreur recherche KnowledgeDocuments:', error.message);
    return [];
  }
}

/**
 * Calcule la similarité cosine entre deux vecteurs
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Les vecteurs doivent avoir la même dimension');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Pipeline RAG complet : Recherche + Génération
 */
export async function processRAGQuery(
  userId: string,
  question: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  customSystemPrompt?: string,
  knowledgeDocs?: Array<{ id: string; name: string; type: string; content: string }>
): Promise<{
  answer: string;
  context: string;
  sourcesCount: number;
  hasContext: boolean;
  hasSemanticContext: boolean;
  maxSimilarity: number;
}> {
  console.log(`[AI Service] Pipeline RAG pour utilisateur ${userId}: "${question}"`);

  // 1. Ajouter le prompt système personnalisé comme première source de contexte
  let systemPromptContext = '';
  if (customSystemPrompt) {
    systemPromptContext = `=== INFORMATIONS SUR L'ASSISTANT ===\n${customSystemPrompt}\n\n`;
    console.log(`[AI Service] Prompt système ajouté au contexte`);
  }

  // 2. Recherche sémantique dans les KnowledgeDocuments vectorisés
  let knowledgeContext = '';
  let knowledgeSources = 0;
  let maxKnowledgeSimilarity = 0;

  if (knowledgeDocs && knowledgeDocs.length > 0) {
    console.log(`[AI Service] ${knowledgeDocs.length} KnowledgeDocuments disponibles`);
    
    const knowledgeResults = await searchKnowledgeDocuments(question, knowledgeDocs, 0.2, 5);
    
    if (knowledgeResults.length > 0) {
      maxKnowledgeSimilarity = Math.max(...knowledgeResults.map(r => r.similarity));
      knowledgeContext = knowledgeResults
        .map((result, index) => {
          return `[Source ${index + 1}: ${result.source}] (Similarité: ${(result.similarity * 100).toFixed(1)}%)\n${result.text}`;
        })
        .join('\n\n---\n\n');
      
      knowledgeSources = knowledgeResults.length;
      console.log(`[AI Service] ${knowledgeSources} chunks pertinents trouvés dans KnowledgeDocuments (Max Sim: ${maxKnowledgeSimilarity.toFixed(2)})`);
    }
  }

  // 3. Récupérer le contexte pertinent depuis la base vectorielle (ancien système)
  const { context: vectorContext, sources } = await getRelevantContext(question, userId);
  const maxVectorSimilarity = sources.length > 0 ? Math.max(...sources.map(s => s.similarity)) : 0;

  const maxSimilarity = Math.max(maxKnowledgeSimilarity, maxVectorSimilarity);

  // 4. Combiner tous les contextes (système + documents + base vectorielle)
  const combinedContext = [systemPromptContext, knowledgeContext, vectorContext]
    .filter(Boolean)
    .join('\n\n=== BASE DE CONNAISSANCES ===\n\n');

  // 5. Générer la réponse avec le contexte combiné
  const answer = await generateAIResponse(
    combinedContext,
    question,
    conversationHistory,
    undefined
  );

  const totalSources = sources.length + knowledgeSources + (customSystemPrompt ? 1 : 0);

  return {
    answer,
    context: combinedContext,
    sourcesCount: totalSources,
    hasContext: combinedContext.length > 0,
    hasSemanticContext: knowledgeSources > 0 || sources.length > 0,
    maxSimilarity,
  };
}
