import { PostHog } from 'posthog-node'
import crypto from 'crypto'

// ===== CLIENT POSTHOG =====
const posthogNode = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.POSTHOG_HOST || 'https://eu.i.posthog.com',
  flushAt: 1,
  flushInterval: 0,
})

// ===== GESTION DE SESSIONS (30 min d'inactivité) =====
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes
const SESSION_CLEANUP_INTERVAL_MS = 60 * 1000 // 1 minute

interface SessionData {
  sessionId: string
  userMessages: number
  botMessages: number
  totalExchanges: number
  startTime: number
  lastActivity: number
  timeoutId: ReturnType<typeof setTimeout> | null
  onEndCallback: ((data: SessionData) => void) | null
}

const sessions = new Map<string, SessionData>()

/**
 * Cache des questions récentes pour la détection de questions répétées.
 * Stocke les N dernières questions par utilisateur avec leur session ID.
 * Nettoyé périodiquement.
 */
const MAX_QUESTIONS_PER_USER = 10
const QUESTION_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 jours

interface CachedQuestion {
  text: string
  sessionId: string
  timestamp: number
}

const recentQuestions = new Map<string, CachedQuestion[]>()

/**
 * Nettoie périodiquement les questions expirées du cache.
 */
const questionCacheCleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, questions] of recentQuestions.entries()) {
    const filtered = questions.filter((q) => now - q.timestamp < QUESTION_CACHE_TTL_MS)
    if (filtered.length === 0) {
      recentQuestions.delete(key)
    } else {
      recentQuestions.set(key, filtered)
    }
  }
}, 60 * 60 * 1000) // 1 heure

if (typeof process !== 'undefined' && process.on) {
  process.on('exit', () => {
    clearInterval(questionCacheCleanup)
  })
}

/**
 * Calcule la similarité de Jaccard entre deux textes (basée sur les mots).
 * Retourne un score entre 0 (totalement différent) et 1 (identique).
 * Simple et rapide, sans nécessiter d'embeddings.
 */
function jaccardSimilarity(textA: string, textB: string): number {
  const normalize = (t: string): Set<string> => {
    // Normaliser : minuscules, enlever la ponctuation, tokenizer par mots
    const words = t
      .toLowerCase()
      .replace(/[^\w\sÀ-ÿ]/g, '')
      .split(/\s+/)
      .filter(Boolean)
    // Enlever les mots trop courts (1-2 caractères) qui faussent la similarité
    const filtered = words.filter((w) => w.length > 2)
    return new Set(filtered)
  }

  const setA = normalize(textA)
  const setB = normalize(textB)

  if (setA.size === 0 || setB.size === 0) return 0

  let intersection = 0
  for (const item of setA) {
    if (setB.has(item)) intersection++
  }

  const union = new Set([...setA, ...setB])
  return intersection / union.size
}

/**
 * Détecte si une question est une répétition d'une question précédente.
 * Compare avec le cache des questions récentes du même utilisateur.
 * Utilise la similarité de Jaccard (seuil ~0.6 équivalent à ~0.85 cosinus).
 *
 * Pour une détection plus précise (via embeddings), utiliser
 * generateEmbedding() + cosineSimilarity() de knowledgeService.
 *
 * @returns l'info de la question répétée, ou null si pas de répétition
 */
export function detectRepeatedQuestion(
  senderPhone: string,
  instanceName: string,
  newQuestion: string,
  similarityThreshold: number = 0.6
): { originalSessionId: string; daysSinceOriginal: number; similarityScore: number } | null {
  const key = `${hashPhone(senderPhone)}:${instanceName}`
  const cached = recentQuestions.get(key)

  if (!cached || cached.length === 0) return null

  for (const previous of cached) {
    const similarity = jaccardSimilarity(newQuestion, previous.text)
    if (similarity >= similarityThreshold) {
      const daysSince = Math.floor(
        (Date.now() - previous.timestamp) / (1000 * 60 * 60 * 24)
      )
      return {
        originalSessionId: previous.sessionId,
        daysSinceOriginal: Math.max(1, daysSince),
        similarityScore: similarity,
      }
    }
  }

  return null
}

/**
 * Ajoute une question au cache pour la détection de répétitions futures.
 */
export function cacheQuestion(
  senderPhone: string,
  instanceName: string,
  question: string,
  sessionId: string
): void {
  const key = `${hashPhone(senderPhone)}:${instanceName}`
  let questions = recentQuestions.get(key) || []

  questions.push({
    text: question,
    sessionId,
    timestamp: Date.now(),
  })

  // Garder seulement les N dernières
  if (questions.length > MAX_QUESTIONS_PER_USER) {
    questions = questions.slice(-MAX_QUESTIONS_PER_USER)
  }

  recentQuestions.set(key, questions)
}

/**
 * Nettoie périodiquement les sessions expirées (celles dont le timeout
 * n'a pas pu s'exécuter, ou qui sont orphelines).
 */
const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [key, session] of sessions.entries()) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      if (session.timeoutId) clearTimeout(session.timeoutId)
      // Exécuter le callback de fin si présent
      if (session.onEndCallback) {
        session.onEndCallback(session)
      }
      sessions.delete(key)
    }
  }
}, SESSION_CLEANUP_INTERVAL_MS)

// Nettoyer le timer à la fin du processus (évite les leaks)
if (typeof process !== 'undefined' && process.on) {
  process.on('exit', () => {
    clearInterval(cleanupTimer)
  })
}

// ===== FONCTIONS UTILITAIRES =====

/**
 * Hash SHA-256 du numéro de téléphone pour l'utiliser comme distinctId.
 * On ne transmet jamais le numéro brut à PostHog.
 */
export function hashPhone(phone: string): string {
  return crypto.createHash('sha256').update(phone.trim()).digest('hex')
}

function getSessionKey(instanceName: string, senderPhone: string): string {
  return `${instanceName}:${senderPhone}`
}

/**
 * Retourne ou crée une session pour un utilisateur.
 * Réinitialise le timeout d'expiration à chaque appel.
 */
function getOrCreateSession(
  instanceName: string,
  senderPhone: string,
  onEnd?: (data: SessionData) => void
): SessionData {
  const key = getSessionKey(instanceName, senderPhone)
  let session = sessions.get(key)

  if (!session) {
    session = {
      sessionId: crypto.randomUUID(),
      userMessages: 0,
      botMessages: 0,
      totalExchanges: 0,
      startTime: Date.now(),
      lastActivity: Date.now(),
      timeoutId: null,
      onEndCallback: onEnd || null,
    }
    sessions.set(key, session)
  } else {
    // Mettre à jour le callback si fourni
    if (onEnd) {
      session.onEndCallback = onEnd
    }
  }

  // Réinitialiser le timeout d'expiration
  if (session.timeoutId) clearTimeout(session.timeoutId)
  const capturedSession = session // capture locale pour le timeout
  session.timeoutId = setTimeout(() => {
    endSessionInternal(instanceName, senderPhone)
  }, SESSION_TTL_MS)

  return session
}

/**
 * Met à jour l'activité d'une session (message utilisateur ou bot).
 * Réinitialise le timeout à chaque mise à jour.
 */
function updateSessionActivity(
  instanceName: string,
  senderPhone: string,
  type: 'user' | 'bot'
): SessionData | null {
  const key = getSessionKey(instanceName, senderPhone)
  const session = sessions.get(key)
  if (!session) return null

  session.lastActivity = Date.now()
  if (type === 'user') {
    session.userMessages++
  } else {
    session.botMessages++
  }
  session.totalExchanges++

  // Réinitialiser le timeout
  if (session.timeoutId) clearTimeout(session.timeoutId)
  session.timeoutId = setTimeout(() => {
    endSessionInternal(instanceName, senderPhone)
  }, SESSION_TTL_MS)

  return session
}

/**
 * Termine une session et la supprime du Map.
 * Retourne les données de session ou null si introuvable.
 */
function endSessionInternal(
  instanceName: string,
  senderPhone: string
): SessionData | null {
  const key = getSessionKey(instanceName, senderPhone)
  const session = sessions.get(key)
  if (!session) return null

  if (session.timeoutId) clearTimeout(session.timeoutId)
  sessions.delete(key)

  // Exécuter le callback de fin s'il existe
  if (session.onEndCallback) {
    try {
      session.onEndCallback(session)
    } catch (err) {
      console.error('[Analytics] Erreur dans le callback de fin de session:', err)
    }
  }

  return session
}

// ===== FONCTIONS DE TRACKING =====

const PRODUCT = 'uauben'

/**
 * 1. message_sent
 * Déclenché à chaque message utilisateur entrant.
 * La session est automatiquement créée ou reprise.
 */
export async function trackMessageSent(
  senderPhone: string,
  instanceName: string,
  source: 'qr_code' | 'direct_link' | 'referral' | 'unknown' = 'unknown'
): Promise<{ sessionId: string; userMessages: number }> {
  let sessionId: string
  let userMessages: number

  // Créer ou reprendre la session
  const session = getOrCreateSession(instanceName, senderPhone, (endedSession) => {
    // Callback déclenché quand la session expire (30 min) → conversation_depth
    trackConversationDepth(
      senderPhone,
      instanceName,
      endedSession.sessionId,
      endedSession.userMessages,
      endedSession.botMessages,
      endedSession.totalExchanges,
      Math.round((Date.now() - endedSession.startTime) / 1000)
    ).catch((err) => console.error('[Analytics] Erreur trackConversationDepth:', err))
  })

  // Incrémenter le compteur de messages utilisateur
  const updated = updateSessionActivity(instanceName, senderPhone, 'user')
  sessionId = session.sessionId
  userMessages = updated?.userMessages ?? 1

  const distinctId = hashPhone(senderPhone)

  posthogNode.capture({
    distinctId,
    event: 'message_sent',
    properties: {
      product: PRODUCT,
      instance_name: instanceName,
      message_count_in_session: userMessages,
      session_id: sessionId,
      source,
    },
  })

  return { sessionId, userMessages }
}

/**
 * 2. user_returned
 * Déclenché quand un utilisateur connu revient après au moins 1 jour.
 */
export async function trackUserReturned(
  senderPhone: string,
  instanceName: string,
  daysSinceLastMessage: number,
  totalSessionsCount: number
): Promise<void> {
  const distinctId = hashPhone(senderPhone)

  posthogNode.capture({
    distinctId,
    event: 'user_returned',
    properties: {
      product: PRODUCT,
      instance_name: instanceName,
      days_since_last_message: daysSinceLastMessage,
      total_sessions_count: totalSessionsCount,
    },
  })
}

/**
 * 3. conversation_depth
 * Déclenché à la fin d'une session (30 min d'inactivité).
 */
export async function trackConversationDepth(
  senderPhone: string,
  instanceName: string,
  sessionId: string,
  userMessages: number,
  botMessages: number,
  totalExchanges: number,
  sessionDurationSeconds: number
): Promise<void> {
  const distinctId = hashPhone(senderPhone)

  posthogNode.capture({
    distinctId,
    event: 'conversation_depth',
    properties: {
      product: PRODUCT,
      instance_name: instanceName,
      session_id: sessionId,
      total_exchanges: totalExchanges,
      user_messages_count: userMessages,
      bot_messages_count: botMessages,
      session_duration_seconds: sessionDurationSeconds,
    },
  })
}

/**
 * 4. knowledge_base_hit
 * Déclenché quand le bot répond en s'appuyant sur la base de connaissances (RAG).
 */
export async function trackKnowledgeBaseHit(
  senderPhone: string,
  instanceName: string,
  sessionId: string,
  documentMatched: string,
  confidenceScore: number,
  questionTextLength: number
): Promise<void> {
  const distinctId = hashPhone(senderPhone)

  posthogNode.capture({
    distinctId,
    event: 'knowledge_base_hit',
    properties: {
      product: PRODUCT,
      instance_name: instanceName,
      session_id: sessionId,
      document_matched: documentMatched,
      confidence_score: Math.round(confidenceScore * 10000) / 10000, // arrondi à 4 décimales
      question_text_length: questionTextLength,
    },
  })
}

/**
 * 5. knowledge_base_miss
 * Déclenché quand le bot ne trouve PAS de correspondance dans la KB.
 */
export async function trackKnowledgeBaseMiss(
  senderPhone: string,
  instanceName: string,
  sessionId: string,
  questionTextLength: number,
  fallbackType: 'low_confidence' | 'no_match' | 'error'
): Promise<void> {
  const distinctId = hashPhone(senderPhone)

  posthogNode.capture({
    distinctId,
    event: 'knowledge_base_miss',
    properties: {
      product: PRODUCT,
      instance_name: instanceName,
      session_id: sessionId,
      question_text_length: questionTextLength,
      fallback_type: fallbackType,
    },
  })
}

/**
 * 6. fallback_triggered
 * Déclenché quand le bot utilise un message de fallback.
 */
export async function trackFallbackTriggered(
  senderPhone: string,
  instanceName: string,
  sessionId: string,
  fallbackReason: 'out_of_scope' | 'ambiguous' | 'language_not_supported' | 'error' | 'no_match',
  userMessagePreview: string
): Promise<void> {
  const distinctId = hashPhone(senderPhone)

  posthogNode.capture({
    distinctId,
    event: 'fallback_triggered',
    properties: {
      product: PRODUCT,
      instance_name: instanceName,
      session_id: sessionId,
      fallback_reason: fallbackReason,
      user_message_preview: userMessagePreview.substring(0, 50),
    },
  })
}

/**
 * 7. question_repeated
 * Déclenché quand un utilisateur pose une question très similaire à une question
 * déjà posée dans une session précédente.
 *
 * Note : la détection est basée sur la similarité textuelle via embeddings.
 * Pour une version sans embedding, on peut aussi utiliser la comparaison
 * de texte simple (Levenshtein, Jaccard, etc.).
 */
export async function trackQuestionRepeated(
  senderPhone: string,
  instanceName: string,
  sessionId: string,
  originalSessionId: string,
  daysSinceOriginal: number,
  similarityScore: number
): Promise<void> {
  const distinctId = hashPhone(senderPhone)

  posthogNode.capture({
    distinctId,
    event: 'question_repeated',
    properties: {
      product: PRODUCT,
      instance_name: instanceName,
      session_id: sessionId,
      original_session_id: originalSessionId,
      days_since_original: daysSinceOriginal,
      similarity_score: Math.round(similarityScore * 10000) / 10000,
    },
  })
}

/**
 * 8. new_user_first_message
 * Déclenché lors du TOUT PREMIER message d'un utilisateur.
 * Appelle aussi identify pour enrichir le profil.
 */
export async function trackNewUserFirstMessage(
  senderPhone: string,
  instanceName: string,
  source: 'qr_code' | 'direct_link' | 'referral' | 'unknown' = 'unknown',
  entryPoint?: string
): Promise<void> {
  const distinctId = hashPhone(senderPhone)

  posthogNode.capture({
    distinctId,
    event: 'new_user_first_message',
    properties: {
      product: PRODUCT,
      instance_name: instanceName,
      source,
      entry_point: entryPoint || null,
    },
  })

  // Enrichir le profil utilisateur
  posthogNode.identify({
    distinctId,
    properties: {
      first_seen_at: new Date().toISOString(),
      acquisition_source: source,
      instance_name: instanceName,
      product: PRODUCT,
    },
  })
}

/**
 * 9. one_shot_user
 * Utilisé dans le cron job quotidien.
 */
export async function trackOneShotUser(
  senderPhone: string,
  instanceName: string,
  daysSinceOnlyMessage: number,
  messageContentLength: number,
  botResponseWasFallback: boolean
): Promise<void> {
  const distinctId = hashPhone(senderPhone)

  posthogNode.capture({
    distinctId,
    event: 'one_shot_user',
    properties: {
      product: PRODUCT,
      instance_name: instanceName,
      days_since_only_message: daysSinceOnlyMessage,
      message_content_length: messageContentLength,
      bot_response_was_fallback: botResponseWasFallback,
    },
  })
}

// ===== API PUBLIQUE POUR LA GESTION DES SESSIONS =====

/**
 * Récupère les infos d'une session active sans la créer.
 * Utile pour obtenir le sessionId après avoir tracké message_sent.
 */
export function getActiveSession(
  instanceName: string,
  senderPhone: string
): { sessionId: string; userMessages: number; botMessages: number } | null {
  const key = getSessionKey(instanceName, senderPhone)
  const session = sessions.get(key)
  if (!session) return null
  return {
    sessionId: session.sessionId,
    userMessages: session.userMessages,
    botMessages: session.botMessages,
  }
}

/**
 * Met à jour le compteur de messages bot dans la session active.
 * À appeler après l'envoi de la réponse.
 */
export function trackBotResponse(
  instanceName: string,
  senderPhone: string
): void {
  updateSessionActivity(instanceName, senderPhone, 'bot')
}

/**
 * Ferme immédiatement une session (pour la terminer proprement).
 * Déclenche le callback conversation_depth.
 */
export function closeSession(
  instanceName: string,
  senderPhone: string
): { sessionId: string; userMessages: number; botMessages: number; totalExchanges: number; startTime: number } | null {
  const session = endSessionInternal(instanceName, senderPhone)
  if (!session) return null
  return {
    sessionId: session.sessionId,
    userMessages: session.userMessages,
    botMessages: session.botMessages,
    totalExchanges: session.totalExchanges,
    startTime: session.startTime,
  }
}

export { posthogNode }