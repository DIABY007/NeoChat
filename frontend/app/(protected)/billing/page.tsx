'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { Check, Sparkles, Crown, Send, Bot, Zap, X, Star } from 'lucide-react';
import axios from 'axios';
import { analytics } from '@/lib/analytics';

interface Plan {
  id: string;
  name: string;
  price: number;
  messages: number;
  discount: number;
  finalPrice: number;
}

interface PricingPlan {
  id: 'diffusion' | 'assistant' | 'premium';
  name: string;
  price: number;
  tagline: string;
  features: Array<{ text: string; included: boolean }>;
  isPopular?: boolean;
}

export default function BillingPage() {
  const { user, token } = useAuthStore();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [hasReferral, setHasReferral] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'diffusion' | 'assistant' | 'premium'>('premium');

  const pricingPlans: PricingPlan[] = [
    {
      id: 'diffusion',
      name: 'Diffusion',
      price: 5000,
      tagline: 'Pour envoyer des offres de masse.',
      features: [
        { text: 'Envois de campagnes groupées', included: true },
        { text: 'Variations anti-spam des messages', included: true },
        { text: 'Historique des envois', included: true },
        { text: 'Bot automatique 24/7', included: false },
        { text: 'Base de connaissances', included: false },
      ],
    },
    {
      id: 'assistant',
      name: 'Assistant IA',
      price: 7500,
      tagline: 'Pour un support client 24/7.',
      features: [
        { text: 'Réponses automatiques 24/7', included: true },
        { text: 'Base de connaissances (PDF/Texte)', included: true },
        { text: 'Personnalisation de l\'IA', included: true },
        { text: 'Campagnes marketing', included: false },
        { text: 'Variations anti-spam', included: false },
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 10000,
      tagline: 'La machine de guerre pour votre business.',
      isPopular: true,
      features: [
        { text: 'Toutes les fonctionnalités Diffusion + Assistant IA', included: true },
        { text: 'Jusqu\'à 5 000 messages par mois', included: true },
        { text: 'Support prioritaire VIP', included: true },
        { text: 'Campagnes marketing illimitées', included: true },
        { text: 'Base de connaissances avancée', included: true },
      ],
    },
  ];

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    try {
      const response = await axios.get('/api/billing/plan', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPlan(response.data.data.plan);
      setHasReferral(response.data.data.hasReferral);
    } catch (error) {
      console.error('Erreur lors de la récupération du plan:', error);
      toast.error('Impossible de charger le plan');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: 'diffusion' | 'assistant' | 'premium') => {
    setProcessing(true);
    setSelectedPlan(planId);

    analytics.trackCheckoutStarted(planId, !!user?.referredBy);
    analytics.trackPlanUpgradeClicked(
      plan?.name || 'TRIAL',
      planId.toUpperCase(),
      'billing_page'
    );

    try {
      toast.info('Le paiement en ligne est temporairement en maintenance. Contactez le support pour activer votre formule.');
      const planName = planId.toUpperCase();
      const phoneParam = user?.phone ? ` pour mon compte (${user.phone})` : '';
      const whatsappMsg = encodeURIComponent(`Bonjour NeoChat, je souhaite activer le forfait ${planName}${phoneParam}.`);
      const supportPhone = (process.env.NEXT_PUBLIC_SUPPORT_PHONE || process.env.NEXT_PUBLIC_ADMIN_PHONE || '').replace(/[^0-9]/g, '');
      if (supportPhone) {
        window.open(`https://wa.me/${supportPhone}?text=${whatsappMsg}`, '_blank');
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            💳 Facturation
          </h1>
          <p className="text-slate-600">
            Gérez votre abonnement
          </p>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-500 mt-4">Chargement du plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          💳 Facturation
        </h1>
        <p className="text-slate-600">
          Choisissez le plan qui vous convient
        </p>
      </div>

      {/* Info Maintenance Paiement */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-900 flex items-start gap-3">
        <span className="text-xl">ℹ️</span>
        <div>
          <h4 className="font-semibold text-sm">Système de paiement en cours d'évolution</h4>
          <p className="text-xs text-blue-700 mt-0.5">
            Le paiement automatisé est momentanément en maintenance. Cliquez sur « Choisir ce plan » pour finaliser votre activation en direct avec notre équipe support WhatsApp.
          </p>
        </div>
      </div>

      {/* Alerte réduction parrainage */}
      {hasReferral && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900 mb-1">
                🎉 Réduction de parrainage active !
              </h3>
              <p className="text-sm text-emerald-700">
                Vous bénéficiez d'une <strong>réduction de 10%</strong> sur tous les plans grâce à votre parrain.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grille des 3 offres */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-6">
        {pricingPlans.map((pricingPlan) => {
          const isPremium = pricingPlan.id === 'premium';
          const discount = hasReferral ? 10 : 0;
          const finalPrice = Math.round(pricingPlan.price * (1 - discount / 100));

          return (
            <div
              key={pricingPlan.id}
              className={`relative bg-white rounded-2xl border-2 transition-all duration-300 ${
                isPremium
                  ? 'border-orange-400 shadow-2xl transform md:scale-105 hover:scale-110'
                  : 'border-slate-200 shadow-sm hover:shadow-lg'
              }`}
            >
              {/* Badge "Le plus populaire" */}
              {isPremium && (
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                    <Star className="w-4 h-4 fill-current" />
                    Le plus populaire
                  </div>
                </div>
              )}

              {/* Header */}
              <div
                className={`p-6 ${
                  isPremium
                    ? 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white'
                    : 'bg-slate-50 border-b border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`p-3 rounded-xl ${
                      isPremium
                        ? 'bg-white/20 backdrop-blur-sm'
                        : 'bg-slate-200'
                    }`}
                  >
                    {pricingPlan.id === 'diffusion' && (
                      <Send className={`w-6 h-6 ${isPremium ? 'text-white' : 'text-slate-600'}`} />
                    )}
                    {pricingPlan.id === 'assistant' && (
                      <Bot className={`w-6 h-6 ${isPremium ? 'text-white' : 'text-slate-600'}`} />
                    )}
                    {pricingPlan.id === 'premium' && (
                      <Crown className="w-6 h-6 text-white" />
                    )}
                  </div>
                  {discount > 0 && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        isPremium
                          ? 'bg-white/20 backdrop-blur-sm text-white'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      -{discount}%
                    </span>
                  )}
                </div>

                <h3
                  className={`text-2xl font-bold mb-2 ${
                    isPremium ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {pricingPlan.name}
                </h3>
                <p
                  className={`text-sm mb-4 ${
                    isPremium ? 'text-white/90' : 'text-slate-600'
                  }`}
                >
                  {pricingPlan.tagline}
                </p>

                <div className="flex items-baseline gap-2">
                  {discount > 0 && (
                    <span
                      className={`text-lg line-through ${
                        isPremium ? 'text-white/70' : 'text-slate-400'
                      }`}
                    >
                      {pricingPlan.price.toLocaleString('fr-FR')}
                    </span>
                  )}
                  <span
                    className={`text-4xl font-bold ${
                      isPremium ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {finalPrice.toLocaleString('fr-FR')}
                  </span>
                  <span
                    className={`text-sm ${
                      isPremium ? 'text-white/80' : 'text-slate-600'
                    }`}
                  >
                    FCFA/mois
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="p-6">
                <ul className="space-y-3 mb-6">
                  {pricingPlan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      {feature.included ? (
                        <div className="bg-green-100 p-1 rounded-full mt-0.5">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="bg-slate-100 p-1 rounded-full mt-0.5">
                          <X className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <span
                        className={`text-sm ${
                          feature.included
                            ? 'text-slate-700'
                            : 'text-slate-400 line-through'
                        }`}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(pricingPlan.id)}
                  disabled={processing && selectedPlan === pricingPlan.id}
                  className={`w-full font-bold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isPremium
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg hover:shadow-xl'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-300'
                  }`}
                >
                  {processing && selectedPlan === pricingPlan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                      Traitement...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {isPremium && <Zap className="w-5 h-5" />}
                      Choisir {pricingPlan.name}
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section copywriting - Économie réalisée */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 md:p-8 text-center">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-3">
            💡 Pourquoi choisir Premium ?
          </h3>
          <p className="text-lg text-slate-700 mb-4">
            En prenant l'IA et la Diffusion séparément, vous paieriez{' '}
            <span className="font-bold text-red-600">12 500 FCFA</span>.
          </p>
          <p className="text-xl font-bold text-blue-600">
            Économisez 2 500 FCFA et débloquez tout le potentiel de votre entreprise pour seulement{' '}
            <span className="text-orange-600">10 000 FCFA</span> !
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-md">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-slate-900">
              Soit 20% d'économie avec Premium
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
