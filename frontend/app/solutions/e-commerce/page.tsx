import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, TrendingUp, Clock, Zap, Check } from 'lucide-react';
import { WebPageSchema } from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Bot WhatsApp pour E-commerce - Boostez vos ventes',
  description: 'Automatisez vos ventes e-commerce sur WhatsApp avec NeoChat. Bot IA 24/7, diffusion anti-spam, gestion des commandes. Augmentez votre chiffre d\'affaires de 300% en Afrique.',
  keywords: ['bot WhatsApp e-commerce', 'vente WhatsApp', 'automatisation e-commerce', 'boutique en ligne WhatsApp', 'commerce Afrique'],
  openGraph: {
    title: 'Bot WhatsApp pour E-commerce - Boostez vos ventes | NeoChat',
    description: 'Automatisez vos ventes e-commerce sur WhatsApp avec NeoChat. Bot IA 24/7, diffusion anti-spam, gestion des commandes.',
    url: 'https://neochat.pro/solutions/e-commerce',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bot WhatsApp pour E-commerce - Boostez vos ventes | NeoChat',
    description: 'Automatisez vos ventes e-commerce sur WhatsApp avec NeoChat. Bot IA 24/7.',
  },
};

export const revalidate = 86400;

export default function EcommercePage() {
  const benefits = [
    {
      icon: <Clock className="w-8 h-8 text-orange-600" />,
      title: 'Ventes 24/7',
      description: 'Votre bot répond aux clients même quand vous dormez',
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-green-600" />,
      title: '+300% de conversions',
      description: 'Réponses instantanées = plus de ventes',
    },
    {
      icon: <Zap className="w-8 h-8 text-blue-600" />,
      title: 'Diffusion ciblée',
      description: 'Envoyez vos promotions sans risque de ban',
    },
    {
      icon: <ShoppingCart className="w-8 h-8 text-purple-600" />,
      title: 'Gestion des commandes',
      description: 'Catalogue produits, prix, stock automatisés',
    },
  ];

  const features = [
    'Catalogue produits intégré',
    'Gestion automatique des prix',
    'Suivi des commandes',
    'Notifications de stock',
    'Promotions programmées',
    'Statistiques de vente',
  ];

  return (
    <>
      <WebPageSchema
        name="Bot WhatsApp pour E-commerce"
        description="Automatisez vos ventes e-commerce sur WhatsApp avec NeoChat"
        url="https://neochat.pro/solutions/e-commerce"
      />
      <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-slate-200 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/logo-neochat.svg"
                  alt="Logo NeoChat - Plateforme d'automatisation WhatsApp"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <span className="text-xl font-bold text-slate-900">NeoChat</span>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-orange-500 to-amber-600">
                  Démarrer Gratuitement
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-6">
                Bot WhatsApp pour{' '}
                <span className="bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
                  E-commerce
                </span>
                <br />
                Boostez vos ventes de 300%
              </h1>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
                Automatisez vos ventes sur WhatsApp avec un bot IA intelligent. Répondez instantanément, 
                gérez votre catalogue et envoyez des promotions sans risque de ban.
              </p>
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-8 py-6 text-lg">
                  🚀 Essai Gratuit 3 Jours
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
              {benefits.map((benefit, index) => (
                <Card key={index} className="border-2 hover:border-orange-300 transition-all">
                  <CardHeader>
                    <div className="mb-4">{benefit.icon}</div>
                    <CardTitle className="text-xl">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-20">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
                Fonctionnalités E-commerce
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <span className="text-slate-700 text-lg">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="mr-4">
                  Voir les Tarifs
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="ghost">
                  ← Retour à l'accueil
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
