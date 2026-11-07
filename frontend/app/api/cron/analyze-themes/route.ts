import { NextRequest, NextResponse } from 'next/server';

/**
 * Route handler sécurisé pour l'analyse thématique quotidienne
 * Appelé par cron-job.org une fois par jour
 * Valide le CRON_SECRET puis délègue au backend
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Cron Next.js] 🔄 Requête d\'analyse thématique reçue');

  try {
    // 1. Vérifier l'autorisation
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[Cron Next.js] ❌ CRON_SECRET non configuré dans les variables d\'environnement');
      return NextResponse.json(
        { error: 'Configuration serveur invalide' },
        { status: 500 }
      );
    }

    // Supporte: "Authorization: Bearer <secret>" ou "Authorization: <secret>"
    const providedSecret = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!providedSecret || providedSecret !== cronSecret) {
      console.warn('[Cron Next.js] ⛔ Tentative d\'accès non autorisée');
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    console.log('[Cron Next.js] ✅ Autorisation validée');

    // 2. Forwarder la requête au backend interne
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';
    const backendEndpoint = `${backendUrl}/api/cron/analyze-themes`;

    console.log(`[Cron Next.js] 📡 Appel du backend: ${backendEndpoint}`);

    const backendResponse = await fetch(backendEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret,  // Le backend attend ce header
      },
    });

    // 3. Récupérer et retourner la réponse
    const data = await backendResponse.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!backendResponse.ok) {
      console.error(`[Cron Next.js] ❌ Erreur backend (${backendResponse.status}):`, data);
      return NextResponse.json(
        {
          error: 'Erreur lors de l\'analyse',
          detail: data.error || data,
          duration: `${duration}s`,
        },
        { status: backendResponse.status }
      );
    }

    console.log(`[Cron Next.js] ✅ Analyse terminée en ${duration}s`);
    console.log(`[Cron Next.js] 📊 Résultat:`, JSON.stringify(data).substring(0, 300));

    return NextResponse.json({
      ...data,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[Cron Next.js] ❌ Erreur après ${duration}s:`, error.message);

    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        message: error.message,
        duration: `${duration}s`,
      },
      { status: 500 }
    );
  }
}

/**
 * Réponse pour GET (non supporté)
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Méthode non autorisée. Utilisez POST.' },
    { status: 405 }
  );
}