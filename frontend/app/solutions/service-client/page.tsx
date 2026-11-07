import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Users, Clock, Smile, Check } from 'lucide-react';
import { WebPageSchema } from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Bot WhatsApp Service Client - Support Automatisé 24/7',
  description: 'Automatisez votre service client sur WhatsApp avec NeoChat. Bot IA intelligent, réponses instantanées, satisfaction client maximale. Réduisez vos coûts de support de 70%.',
  keywords: ['bot service client WhatsApp', 'support client automatisé', 'chatbot support', 'service client IA', 'WhatsApp Business support'],
  openGraph: {
    title: 'Bot WhatsApp Service Client - Support Automatisé 24/7 | NeoChat',
    description: 'Automatisez votre service client sur WhatsApp avec NeoChat. Bot IA intelligent, réponses instantanées.',
    url: 'https://neochat.pro/solutions/service-client',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bot WhatsApp Service Client - Support Automatisé 24/7 | NeoChat',
    description: 'Automatisez votre service client sur WhatsApp avec NeoChat.',
  },
};

export const revalidate = 86400;

export default function ServiceClientPage() {
  const benefits = [
    {
      icon: <Clock className="w-8 h-8 text-blue-600" />,
      title: 'Support 24/7',
      description: 'Vos clients obtiennent des réponses instantanées à toute heure',
    },
    {
      icon: <Smile className="w-8 h-8 text-green-600" />,
      title: 'Satisfaction +90%',
      description: 'Réponses rapides et précises grâce à l\'IA',
    },
    {
      icon: <Users className="w-8 h-8 text-purple-600" />,
      title: '-70% de coûts',
      description: 'Réduisez drastiquement vos coûts de support',
    },
    {
      icon: <MessageCircle className="w-8 h-8 text-orange-600" />,
      title: 'FAQ automatisée',
      description: 'Le bot répond aux questions fréquentes automatiquement',
    },
  ];

  const features = [
    'Réponses automatiques intelligentes',
    'Base de connaissances personnalisée',
    'Escalade vers humain si nécessaire',
    'Historique des conversations',
    'Statistiques de satisfaction',
    'Multi-langues (FR, EN)',
  ];

  return (
    <>
      <WebPageSchema
        name="Bot WhatsApp Service Client"
        description="Automatisez votre service client sur WhatsApp avec NeoChat"
        url="https://neochat.pro/solutions/service-client"
      />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600">
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
                Bot WhatsApp{' '}
                <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                  Service Client
                </span>
                <br />
                Support Automatisé 24/7
              </h1>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
                Offrez un support client exceptionnel sur WhatsApp avec un bot IA qui répond instantanément 
                à vos clients, jour et nuit. Réduisez vos coûts et augmentez la satisfaction.
              </p>
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-6 text-lg">
                  🚀 Essai Gratuit 3 Jours
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
              {benefits.map((benefit, index) => (
                <Card key={index} className="border-2 hover:border-blue-300 transition-all">
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
                Fonctionnalités Service Client
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
