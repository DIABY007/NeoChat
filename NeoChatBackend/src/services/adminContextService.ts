import prisma from '../config/prisma';

/**
 * Récupère les annonces express et événements BGE actifs pour le LLM.
 * Gère automatiquement l'expiration et la distinction BGE / Administration.
 */
export async function getAdminInstitutionalContext(): Promise<{
  contextBlock: string;
  hasAnnonces: boolean;
}> {
  const now = new Date();
  const annonces = await prisma.annonceExpress.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { expiresAt: { gt: now } },
        { expiresAt: null }, // Permanent
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      type: true,
      message: true,
      createdAt: true,
      expiresAt: true,
      createdByAdmin: {
        select: { name: true, role: true },
      },
    },
  });

  if (annonces.length === 0) {
    return { contextBlock: '', hasAnnonces: false };
  }

  const contextBlock = [
    '=== 📢 ANNONCES ET VIE ÉTUDIANTE (BGE & ADMINISTRATION) ===',
    '',
    '[CONSIGNE DE SOURCE] :',
    '- Les annonces marquées [BGE] proviennent du Bureau Général des Étudiants (soirées, galas, tournois sportifs, vie de campus, rappels aux délégués). Lorsque tu réponds sur un de ces sujets, précise poliment : "D\'après le BGE..." ou "Selon l\'annonce du BGE...".',
    '- Les annonces marquées [ADMINISTRATION] proviennent de la direction et ont une autorité institutionnelle stricte.',
    '- Ces annonces sont en cours de validité. Ne réponds jamais sur un événement passé.',
    '',
    ...annonces.map((a, i) => {
      const date = new Date(a.createdAt).toLocaleDateString('fr-FR');
      const isBGE = a.createdByAdmin?.role === 'BGE';
      const roleLabel = isBGE ? 'BGE' : 'ADMINISTRATION';
      const author = a.createdByAdmin?.name ? `${a.createdByAdmin.name} (${roleLabel})` : roleLabel;
      const typeLabel = a.type === 'EVENEMENT' ? '🎉 ÉVÉNEMENT' : '📢 ANNONCE';
      const title = a.title ? ` : ${a.title}` : '';
      const expirationNote = a.expiresAt
        ? ` (Valable jusqu'au ${new Date(a.expiresAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})`
        : ' (Permanent)';

      return `[${roleLabel}] ${typeLabel}${title} [${date} — ${author}]${expirationNote} :\n${a.message}`;
    }),
    '',
    '---',
    '',
  ].join('\n');

  return { contextBlock, hasAnnonces: true };
}

/**
 * Version simplifiée pour injection directe dans le prompt système du LLM.
 * Retourne uniquement le texte, prêt à être concaténé.
 */
export async function buildAdminContextForLLM(): Promise<string> {
  const { contextBlock } = await getAdminInstitutionalContext();

  // Date actuelle automatique
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const tz = 'UTC';

  const dateBlock = [
    '=== 🕐 DATE ET HEURE ACTUELLES ===',
    '',
    `Date : ${dateStr}`,
    `Heure : ${timeStr} (${tz})`,
    '',
    '---',
    '',
  ].join('\n');

  const parts = [dateBlock];
  if (contextBlock) parts.push(contextBlock);

  return [
    '',
    '═══════════════════════════════════════════',
    'CONTEXTE INSTITUTIONNEL (Université)',
    '═══════════════════════════════════════════',
    '',
    ...parts,
    '═══════════════════════════════════════════',
  ].join('\n');
}