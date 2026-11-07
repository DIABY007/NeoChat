import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Crown, Zap, Star } from 'lucide-react';
import { SoftwareApplicationSchema } from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Tarifs - Plans & Abonnements',
  description: 'Choisissez le plan NeoChat adapté à votre business. À partir de 5000 FCFA/mois. Essai gratuit 3 jours, sans carte bancaire. Automatisez vos ventes WhatsApp dès aujourd\'hui.',
  keywords: ['tarifs bot WhatsApp', 'prix automatisation WhatsApp', 'abonnement chatbot', 'plan WhatsApp Business', 'tarif FCFA'],
  openGraph: {
    title: 'Tarifs NeoChat - Plans & Abonnements Bot WhatsApp',
    description: 'Choisissez le plan NeoChat adapté à votre business. À partir de 5000 FCFA/mois. Essai gratuit 3 jours.',
    url: 'https://neochat.pro/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tarifs NeoChat - Plans & Abonnements Bot WhatsApp',
    description: 'Choisissez le plan NeoChat adapté à votre business. À partir de 5000 FCFA/mois.',
  },
};

export const revalidate = 86400;

export default function PricingPage() {
  const plans = [
    {
      name: 'Diffusion',
      icon: '📤',
      price: '5 000',
      description: 'Pour les campagnes marketing WhatsApp',
      features: [
        'Diffusion illimitée anti-spam',
        '1 instance WhatsApp',
        'Envoi programmé',
        'Statistiques de base',
        'Support par email',
      ],
      cta: 'Commencer',
      highlighted: false,
    },
    {
      name: 'Bot IA',
      icon: '🤖',
      price: '7 500',
      description: 'Pour l\'automatisation intelligente',
      features: [
        'Tout du plan Diffusion',
        'Bot IA conversationnel',
        'Base de connaissances illimitée',
        'Réponses 24/7',
        'Statistiques avancées',
        'Support prioritaire',
      ],
      cta: 'Essayer Gratuitement',
      highlighted: true,
    },
    {
      name: 'Business',
      icon: '👑',
      price: '10 000',
      description: 'Pour les entreprises en croissance',
      features: [
        'Tout du plan Bot IA',
        '3 instances WhatsApp',
        'API d\'intégration',
        'Webhooks personnalisés',
        'Support VIP (WhatsApp)',
        'Onboarding personnalisé',
      ],
      cta: 'Démarrer',
      highlighted: false,
    },
  ];

  return (
    <>
      <SoftwareApplicationSchema />
      <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Des tarifs simples,{' '}
              <span className="bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
                rentabilisés dès la première vente
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-4">
              Tous les plans incluent 3 jours d'essai gratuit. Annulez quand vous voulez.
            </p>
            <p className="text-sm text-slate-500">
              💰 Réduction de 1 000 FCFA avec un code parrain
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${
                  plan.highlighted
                    ? 'border-2 border-orange-500 shadow-2xl scale-105'
                    : 'border-2 border-slate-200 hover:border-orange-300'
                } transition-all`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                      ⭐ Plus Populaire
                    </span>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-3xl">{plan.icon}</span>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                      <span className="text-slate-600">FCFA/mois</span>
                    </div>
                  </div>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register">
                    <Button
                      className={`w-full ${
                        plan.highlighted
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700'
                          : 'bg-slate-900 hover:bg-slate-800'
                      } text-white font-semibold py-6 text-lg`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Link href="/">
              <Button variant="outline" size="lg">
                ← Retour à l'accueil
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
