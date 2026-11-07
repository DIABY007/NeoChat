import { Router, Request, Response } from 'express';
import { getAdminInstitutionalContext } from '../services/adminContextService';

const router = Router();

/**
 * GET /api/admin/agent-context
 * Endpoint appelé par le bot WhatsApp pour récupérer le contexte institutionnel.
 * Retourne :
 *   - contextBlock  : le texte complet à injecter dans le prompt LLM
 *   - hasAnnonces   : true s'il y a des annonces actives
 *   - hasDocument   : true s'il y a un document institutionnel actif
 */
router.get('/agent-context', async (_req: Request, res: Response) => {
  try {
    const context = await getAdminInstitutionalContext();

    res.status(200).json({
      success: true,
      data: {
        contextBlock: context.contextBlock,
        hasAnnonces: context.hasAnnonces,
        hasDocument: false,
        // Métadonnées utiles pour le débogage
        meta: {
          annoncesCount: context.hasAnnonces
            ? (context.contextBlock.match(/📢 ANNONCE /g) || []).length
            : 0,
          chars: context.contextBlock.length,
        },
      },
    });
  } catch (error: any) {
    console.error('[AdminAgent] Erreur récupération contexte:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du contexte institutionnel',
    });
  }
});

/**
 * GET /api/admin/agent-context/raw
 * Version retournant uniquement le texte brut, prêt à concaténer.
 * Utile pour les appels programmatiques légers.
 */
router.get('/agent-context/raw', async (_req: Request, res: Response) => {
  try {
    const { buildAdminContextForLLM } = await import('../services/adminContextService');
    const raw = await buildAdminContextForLLM();

    res.status(200)
      .type('text/plain; charset=utf-8')
      .send(raw || 'Aucun contexte institutionnel disponible.');
  } catch (error: any) {
    console.error('[AdminAgent] Erreur:', error);
    res.status(500).send('Erreur lors de la génération du contexte');
  }
});

export default router;