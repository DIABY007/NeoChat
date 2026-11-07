'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Zap, Crown } from 'lucide-react';

type PlanType = 'TRIAL' | 'ASSISTANT' | 'DIFFUSION' | 'PREMIUM' | 'EXPIRED';

interface FeatureGateProps {
  children: ReactNode;
  requiredPlans: PlanType[];
  featureName: string;
  featureDescription?: string;
  fallback?: ReactNode;
}

/**
 * Composant de contrôle d'accès basé sur le plan d'abonnement
 * 
 * Usage:
 * <FeatureGate requiredPlans={['DIFFUSION', 'PREMIUM']} featureName="Campagnes de diffusion">
 *   <BroadcastComponent />
 * </FeatureGate>
 */
export default function FeatureGate({
  children,
  requiredPlans,
  featureName,
  featureDescription,
  fallback,
}: FeatureGateProps) {
  const { subscription } = useAuthStore();
  const router = useRouter();

  if (!subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const currentPlan = subscription.status;
  const hasAccess = requiredPlans.includes(currentPlan);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Afficher le fallback personnalisé si fourni
  if (fallback) {
    return <>{fallback}</>;
  }

  // Afficher l'écran de blocage par défaut
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="max-w-2xl w-full border-2 border-slate-200 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold text-slate-900">
            Fonctionnalité Premium
          </CardTitle>
          <CardDescription className="text-base md:text-lg">
            {featureDescription || `${featureName} nécessite un plan supérieur`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900 mb-2">
                  Accès requis : {getPlanNames(requiredPlans)}
                </p>
                <p className="text-sm text-slate-600">
                  Votre plan actuel : <span className="font-semibold">{getPlanLabel(currentPlan)}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-600 text-center">
              {getUpgradeMessage(currentPlan, requiredPlans)}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push('/billing')}
                className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold"
              >
                <Zap className="w-4 h-4 mr-2" />
                Voir les plans
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="flex-1 h-12"
              >
                Retour au dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getPlanNames(plans: PlanType[]): string {
  return plans.map(plan => getPlanLabel(plan)).join(' ou ');
}

function getPlanLabel(plan: PlanType): string {
  const labels: Record<PlanType, string> = {
    TRIAL: 'Essai gratuit',
    ASSISTANT: 'Assistant IA',
    DIFFUSION: 'Diffusion',
    PREMIUM: 'Premium',
    EXPIRED: 'Expiré',
  };
  return labels[plan] || plan;
}

function getUpgradeMessage(currentPlan: PlanType, requiredPlans: PlanType[]): string {
  if (currentPlan === 'TRIAL') {
    return 'Passez à un plan payant pour débloquer cette fonctionnalité et booster votre business.';
  }

  if (currentPlan === 'ASSISTANT' && requiredPlans.includes('DIFFUSION')) {
    return 'Les campagnes de diffusion nécessitent le plan Diffusion ou Premium.';
  }

  if (currentPlan === 'DIFFUSION' && requiredPlans.includes('ASSISTANT')) {
    return 'Le bot IA et la base de connaissances nécessitent le plan Assistant ou Premium.';
  }

  if (requiredPlans.includes('PREMIUM')) {
    return 'Cette fonctionnalité premium vous permettra de maximiser votre efficacité.';
  }

  return 'Passez à un plan supérieur pour accéder à cette fonctionnalité.';
}
