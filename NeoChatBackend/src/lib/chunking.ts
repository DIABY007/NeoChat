/**
 * Chunking intelligent basé sur les tokens
 * Adapté de NeoWhatAI pour NeoChat
 */

export interface TextChunk {
  text: string;
  index: number;
  startWord: number;
  endWord: number;
  estimatedTokens: number;
}

// Paramètres de chunking
const TARGET_CHUNK_TOKENS = 500;
const OVERLAP_PERCENT = 0.2;
const WORDS_PER_TOKEN = 0.75; // 1 token ≈ 0.75 mots
const TARGET_WORDS = Math.ceil(TARGET_CHUNK_TOKENS / WORDS_PER_TOKEN); // ~667 mots
const OVERLAP_WORDS = Math.ceil(TARGET_WORDS * OVERLAP_PERCENT); // ~133 mots
const MIN_CHUNKS = 2;
const MIN_WORDS_PER_CHUNK = 50;

/**
 * Découpe un texte en chunks intelligents avec overlap
 * @param text Texte à découper
 * @returns Array de chunks avec métadonnées
 */
export function chunkTextByTokens(text: string): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Nettoyage et normalisation
  const cleanedText = text.trim();
  const words = cleanedText.split(/\s+/);
  const totalWords = words.length;

  console.log(`[Chunking] Texte total: ${totalWords} mots`);

  // Cas spécial : texte très court
  if (totalWords < MIN_WORDS_PER_CHUNK) {
    console.log(`[Chunking] Texte trop court (< ${MIN_WORDS_PER_CHUNK} mots), création d'un seul chunk`);
    return [{
      text: cleanedText,
      index: 0,
      startWord: 0,
      endWord: totalWords,
      estimatedTokens: Math.ceil(totalWords * WORDS_PER_TOKEN),
    }];
  }

  // Chunking adaptatif pour textes courts
  let chunkSize = TARGET_WORDS;
  let overlapSize = OVERLAP_WORDS;

  // Si le texte est court, on réduit la taille des chunks pour avoir au moins MIN_CHUNKS
  if (totalWords < TARGET_WORDS * MIN_CHUNKS) {
    chunkSize = Math.max(MIN_WORDS_PER_CHUNK, Math.ceil(totalWords / MIN_CHUNKS));
    overlapSize = Math.ceil(chunkSize * OVERLAP_PERCENT);
    console.log(`[Chunking] Texte court détecté, chunking adaptatif: ${chunkSize} mots/chunk, overlap ${overlapSize} mots`);
  }

  const chunks: TextChunk[] = [];
  let currentPosition = 0;
  let chunkIndex = 0;

  while (currentPosition < totalWords) {
    const endPosition = Math.min(currentPosition + chunkSize, totalWords);
    const chunkWords = words.slice(currentPosition, endPosition);
    const chunkText = chunkWords.join(' ');

    chunks.push({
      text: chunkText,
      index: chunkIndex,
      startWord: currentPosition,
      endWord: endPosition,
      estimatedTokens: Math.ceil(chunkWords.length * WORDS_PER_TOKEN),
    });

    // Avancer avec overlap (sauf pour le dernier chunk)
    if (endPosition < totalWords) {
      currentPosition = endPosition - overlapSize;
    } else {
      break;
    }

    chunkIndex++;
  }

  console.log(`[Chunking] ${chunks.length} chunks créés`);
  
  // Log des statistiques
  chunks.forEach((chunk, i) => {
    console.log(`[Chunking] Chunk ${i}: mots ${chunk.startWord}-${chunk.endWord} (${chunk.endWord - chunk.startWord} mots, ~${chunk.estimatedTokens} tokens)`);
  });

  return chunks;
}

/**
 * Calcule les statistiques d'un texte
 */
export function getTextStats(text: string) {
  const words = text.trim().split(/\s+/);
  const totalWords = words.length;
  const totalChars = text.length;
  const estimatedTokens = Math.ceil(totalWords * WORDS_PER_TOKEN);

  return {
    totalWords,
    totalChars,
    estimatedTokens,
  };
}
