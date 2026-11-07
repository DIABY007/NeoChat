'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Calendar, MessageSquare, Wallet, Gift, TrendingUp, Clock, CheckCircle2, Copy, Share2, Zap, Send, ArrowRight, Crown, Smartphone, Bot, Megaphone, Sparkles, Rocket, Users, BookOpen, HelpCircle, Brain, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

export default function DashboardPage() {
  const { user, subscription, updateSubscription } = useAuthStore();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [instances, setInstances] = useState([]);
  const [documentsCount, setDocumentsCount] = useState(0);
  
  // Broadcast limits for trial users
  const broadcastUsed = 0; // TODO: Get from API
  const broadcastLimit = 10;
  const broadcastPercentage = (broadcastUsed / broadcastLimit) * 100;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log('[Dashboard] Début fetch des statistiques...');
        const [instancesRes, docsRes] = await Promise.all([
          api.get('/instances/list'),
          api.get('/knowledge/documents').catch(() => ({ data: { documents: [] } }))
        ]);
        console.log('[Dashboard] Instances reçues:', instancesRes.data);
        console.log('[Dashboard] Documents reçus:', docsRes.data);
        
        const instancesList = instancesRes.data.data?.instances || instancesRes.data.instances || [];
        const docsList = docsRes.data.data?.documents || docsRes.data.documents || [];
        
        console.log('[Dashboard] Nombre d\'instances:', instancesList.length);
        console.log('[Dashboard] Nombre de documents:', docsList.length);
        
        setInstances(instancesList);
        setDocumentsCount(docsList.length);
      } catch (error: any) {
        console.error('[Dashboard] Erreur chargement dashboard:', error);
        console.error('[Dashboard] Détails erreur:', error.response?.data || error.message);
      }
    };
    if (user) {
      console.log('[Dashboard] User détecté, lancement fetch...');
      fetchDashboardData();
    }
  }, [user]);

  // Rafraîchissement automatique de l'abonnement toutes les 10 secondes
  useEffect(() => {
    if (!user) return;

    const refreshSubscription = async () => {
      try {
        const response = await api.get('/users/me');
        if (response.data.success && response.data.data.subscription) {
          const newSubscription = response.data.data.subscription;
          // Mettre à jour uniquement si le statut a changé
          if (newSubscription.status !== subscription?.status) {
            console.log('[Dashboard] Abonnement mis à jour:', newSubscription.status);
            updateSubscription(newSubscription);
            toast.success(`Abonnement ${newSubscription.status} activé !`);
          }
        }
      } catch (error) {
        console.error('[Dashboard] Erreur rafraîchissement abonnement:', error);
      }
    };

    // Rafraîchir immédiatement puis toutes les 10 secondes
    refreshSubscription();
    const interval = setInterval(refreshSubscription, 10000);

    return () => clearInterval(interval);
  }, [user, subscription?.status, updateSubscription]);

  if (!user || !subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  // Calculer les limites selon le plan
  const getMessageLimit = () => {
    if (subscription.status === 'TRIAL') return 50;
    // ASSISTANT, DIFFUSION, PREMIUM ont des messages illimités
    return Infinity;
  };

  const messageLimit = getMessageLimit();
  const messagesRemaining = messageLimit === Infinity ? Infinity : messageLimit - subscription.messageCount;
  const messagesPercentage = messageLimit === Infinity ? 0 : (subscription.messageCount / messageLimit) * 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'TRIAL':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Actif';
      case 'TRIAL':
        return 'Essai gratuit';
      case 'PREMIUM':
        return 'Premium';
      case 'ASSISTANT':
        return 'Assistant IA';
      case 'DIFFUSION':
        return 'Diffusion';
      case 'EXPIRED':
        return 'Expiré';
      case 'BIG_FISH':
        return 'Illimité';
      default:
        return status;
    }
  };

  const getDaysRemaining = () => {
    // Pour TRIAL, utiliser trialEndsAt
    if (subscription.status === 'TRIAL' && subscription.trialEndsAt) {
      const now = new Date();
      const endDate = new Date(subscription.trialEndsAt);
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    }
    // Pour les plans payés (ASSISTANT, DIFFUSION, PREMIUM), utiliser nextBillingAt
    if (['ASSISTANT', 'DIFFUSION', 'PREMIUM'].includes(subscription.status) && subscription.nextBillingAt) {
      const now = new Date();
      const endDate = new Date(subscription.nextBillingAt);
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    }
    return 0;
  };

  const daysRemaining = getDaysRemaining();

  const handleCopyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      toast.success('Code copié dans le presse-papier !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    const message = `Rejoins-moi sur NeoChat avec mon code de parrainage ${user?.referralCode} et bénéficie d'une réduction de 1000 FCFA ! 🎉`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleHelpRequest = () => {
    const message = `Bonjour, j'ai besoin d'aide concernant NeoChat. Pouvez-vous m'assister ?`;
    const supportPhone = (process.env.NEXT_PUBLIC_SUPPORT_PHONE || process.env.NEXT_PUBLIC_ADMIN_PHONE || '').replace(/[^0-9]/g, '');
    if (supportPhone) {
      window.open(`https://wa.me/${supportPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      toast.error('Numéro de support non configuré');
    }
  };

  const handleUpgradeToPremium = () => {
    router.push('/billing');
  };


  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      {/* En-tête Compact Mobile-First */}
      <div className="space-y-3">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
          Bienvenue {user.lastName || 'Utilisateur'}
        </h2>
        
        {/* Carte d'Abonnement Compacte */}
        <Card className="border-2 border-slate-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-yellow-600" />
                  <h3 className="font-semibold text-slate-900">Abonnement</h3>
                </div>
                {(subscription.trialEndsAt || subscription.nextBillingAt) && (
                  <p className="text-xs text-slate-600">
                    {subscription.status === 'EXPIRED'
                      ? 'Expiré'
                      : daysRemaining > 0
                        ? `Expire dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}`
                        : ''}
                  </p>
                )}
              </div>
              <Badge 
                variant={subscription.status === 'TRIAL' ? 'secondary' : 'default'}
                className={
                  subscription.status === 'TRIAL' 
                    ? 'bg-slate-200 text-slate-800' 
                    : subscription.status === 'ASSISTANT'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0'
                    : subscription.status === 'DIFFUSION'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0'
                    : subscription.status === 'PREMIUM'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0'
                    : subscription.status === 'EXPIRED'
                    ? 'bg-red-500 text-white border-0'
                    : 'bg-slate-200 text-slate-800'
                }
              >
                {subscription.status === 'TRIAL' ? 'FREE' : getStatusLabel(subscription.status)}
              </Badge>
            </div>
            
            {subscription.status === 'TRIAL' && (
              <Button
                onClick={handleUpgradeToPremium}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold"
              >
                <Zap className="w-4 h-4 mr-2" />
                Passer Premium
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vos Statistiques - Grille Haute Densité Mobile-First */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Vos Statistiques</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Carte 1: Messages Envoyés (Pleine largeur mobile) */}
          <Card className="col-span-2 md:col-span-1 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-600 font-medium">Messages Envoyés</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900">{subscription.messageCount}</p>
                  <p className="text-xs text-slate-500">
                    {messageLimit === Infinity ? 'Illimité' : `sur ${messageLimit}`}
                  </p>
                </div>
              </div>
              {messageLimit !== Infinity && (
                <Progress 
                  value={messagesPercentage} 
                  className={`h-2 ${
                    messagesPercentage > 80
                      ? '[&>div]:bg-red-500'
                      : messagesPercentage > 50
                      ? '[&>div]:bg-yellow-500'
                      : '[&>div]:bg-green-500'
                  }`}
                />
              )}
              {messageLimit === Infinity && (
                <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Messages illimités</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Carte 2: Instances Actives */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600 font-medium">Instances</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900">{instances.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Carte 3: Documents IA */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600 font-medium">Documents IA</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900">{documentsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTAs Principaux - Actions Rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CTA 1: Créer Instance WhatsApp */}
        <Card 
          className="group relative overflow-hidden border-2 border-green-200 hover:border-green-400 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.02]"
          onClick={() => router.push('/whatsapp')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="relative p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Smartphone className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                  Connecter WhatsApp
                  <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Créez votre instance et scannez le QR code pour démarrer
                </p>
                <div className="flex items-center gap-2 text-green-600 font-semibold group-hover:gap-3 transition-all">
                  <span>Créer mon instance</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA 2: Facturation */}
        <Card 
          className="group relative overflow-hidden border-2 border-purple-200 hover:border-purple-400 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.02]"
          onClick={() => router.push('/billing')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-violet-50 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="relative p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                  Gérer ma Facturation
                  <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Consultez vos abonnements et mettez à jour vos paiements
                </p>
                <div className="flex items-center gap-2 text-purple-600 font-semibold group-hover:gap-3 transition-all">
                  <span>Accéder à la facturation</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA 3: Lancer une Campagne */}
        <Card 
          className="group relative overflow-hidden border-2 border-orange-200 hover:border-orange-400 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.02]"
          onClick={() => router.push('/broadcast')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="relative p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Megaphone className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                  Créer une Campagne
                  <Rocket className="w-4 h-4 text-orange-500 animate-bounce" />
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Envoyez des messages groupés à vos contacts
                </p>
                <div className="flex items-center gap-2 text-orange-600 font-semibold group-hover:gap-3 transition-all">
                  <span>Lancer ma campagne</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA 4: Programme d'Affiliation */}
        <Card 
          className="group relative overflow-hidden border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.02]"
          onClick={() => router.push('/partner')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="relative p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                  Programme d'Affiliation
                  <Sparkles className="w-4 h-4 text-blue-500" />
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Parrainez vos amis et gagnez des récompenses
                </p>
                <div className="flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-3 transition-all">
                  <span>Découvrir le programme</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Programme Ambassadeur - Inversion hiérarchie Mobile-First */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Programme Ambassadeur</h3>
        
        {/* Bloc 1: La Cagnotte (EN HAUT) */}
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Votre Cagnotte</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl md:text-5xl font-bold text-slate-900">
                    {user.walletBalance.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-lg text-slate-600">FCFA</p>
                </div>
              </div>
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                <Wallet className="w-7 h-7 text-purple-600" />
              </div>
            </div>
            
            {/* Information sur les virements */}
            <p className="text-sm text-center text-slate-600 bg-white/50 rounded-lg p-3">
              💳 Les virements se font chaque lundi
            </p>
          </CardContent>
        </Card>

        {/* Bloc 2: Lien de Parrainage */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-slate-900">Votre Lien de Parrainage</h4>
            </div>
            <p className="text-xs text-slate-600 mb-3">Vous gagnez entre 1 000 et 2 000 FCFA par mois en fonction de l'abonnement par filleul</p>
            
            <div className="flex gap-2">
              <Input
                readOnly
                value={user.referralCode}
                className="h-12 font-mono font-bold text-center"
              />
              <Button
                onClick={handleCopyReferralCode}
                className="h-12 w-12 flex-shrink-0"
                variant="outline"
              >
                {copied ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>
            </div>
            
            <Button
              onClick={handleShareWhatsApp}
              className="w-full h-12 mt-3 bg-green-600 hover:bg-green-700 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager sur WhatsApp
            </Button>
          </CardContent>
        </Card>

        {/* Bloc 3: Les Filleuls (Anti-Tableau, en cartes empilées) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Vos Filleuls
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Empty State si 0 filleul */}
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Gift className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900 mb-1">
                Aucun filleul pour le moment
              </p>
              <p className="text-xs text-slate-500">
                Partagez votre code pour commencer à gagner !
              </p>
            </div>
            
            {/* Exemple de liste de filleuls (à décommenter quand il y a des données) */}
            {/* <div className="flex flex-col divide-y divide-slate-200">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Jean Dupont</p>
                    <p className="text-xs text-slate-500">+226 70 12 34 56</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">12 mars 2026</p>
              </div>
            </div> */}
          </CardContent>
        </Card>
      </div>

      {/* Statistiques rapides avec icônes - SUPPRIMÉ (déjà dans la grille haute densité) */}
      <div className="hidden">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-600 font-medium">Jours restants</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{daysRemaining}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-600 font-medium">Messages</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{messagesRemaining}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-600 font-medium">Cagnotte</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{user.walletBalance}</p>
            <p className="text-xs text-slate-500">FCFA</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/broadcast')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-600 font-medium">Campagnes</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">0</p>
            <button className="mt-2 text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              Créer une campagne
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Statut de l'abonnement avec CTA Premium - SUPPRIMÉ (déjà dans l'en-tête compact) */}
      <Card className="hidden border-2 border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-600" />
                Abonnement
              </CardTitle>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                  subscription.status
                )}`}
              >
                {getStatusLabel(subscription.status)}
              </span>
            </div>
            {subscription.status === 'TRIAL' && (
              <button
                onClick={handleUpgradeToPremium}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
              >
                <Zap className="w-4 h-4" />
                Passer au Premium
              </button>
            )}
          </div>
          <CardDescription>
            Gérez votre abonnement et consultez vos limites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subscription.trialEndsAt && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Fin de l'essai</p>
                    <p className="text-base font-semibold text-slate-900">
                      {new Date(subscription.trialEndsAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}

              {subscription.nextBillingAt && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Prochaine facturation</p>
                    <p className="text-base font-semibold text-slate-900">
                      {new Date(subscription.nextBillingAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {subscription.status === 'TRIAL' && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 mb-1">
                      Passez au Plan Premium
                    </p>
                    <p className="text-sm text-slate-600 mb-3">
                      Débloquez 5000 messages/mois, diffusion illimitée et bien plus !
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-slate-900">10 000 FCFA</span>
                      <span className="text-sm text-slate-600">/ mois</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Barres de progression - Messages & Diffusion - SUPPRIMÉ (déjà dans la grille statistiques) */}
      <div className="hidden grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Consommation Messages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                Messages
              </CardTitle>
              {subscription.status === 'TRIAL' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                  Essai
                </span>
              )}
            </div>
            <CardDescription>
              Consommation mensuelle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-4xl font-bold text-slate-900">
                    {subscription.messageCount}
                  </span>
                  <span className="text-lg text-slate-600 ml-2">/ 50</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {messagesRemaining} restants
                  </p>
                  <p className="text-xs text-slate-500">
                    {100 - Math.round(messagesPercentage)}% disponible
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Progress 
                  value={messagesPercentage} 
                  className={`h-3 ${
                    messagesPercentage > 80
                      ? '[&>div]:bg-red-500'
                      : messagesPercentage > 50
                      ? '[&>div]:bg-yellow-500'
                      : '[&>div]:bg-green-500'
                  }`}
                />
              </div>

              {messagesPercentage > 80 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 font-medium">
                    ⚠️ Attention : Il vous reste moins de 20% de vos messages !
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Consommation Diffusion (Broadcast) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                Diffusion (Broadcast)
              </CardTitle>
              {subscription.status === 'TRIAL' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                  Essai
                </span>
              )}
            </div>
            <CardDescription>
              Limite de contacts pour la diffusion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-4xl font-bold text-slate-900">
                    {broadcastUsed}
                  </span>
                  <span className="text-lg text-slate-600 ml-2">/ {broadcastLimit}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {broadcastLimit - broadcastUsed} contacts restants
                  </p>
                  <p className="text-xs text-slate-500">
                    {100 - Math.round(broadcastPercentage)}% disponible
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Progress 
                  value={broadcastPercentage} 
                  className="h-3 [&>div]:bg-blue-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  💡 <strong>Astuce :</strong> Passez au Premium pour une diffusion illimitée !
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informations utilisateur - SUPPRIMÉ (déjà dans le programme ambassadeur) */}
      <div className="hidden grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cagnotte */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-600" />
              Cagnotte de parrainage
            </CardTitle>
            <CardDescription>Vos gains d'affiliation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wallet className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {user.walletBalance.toLocaleString('fr-FR')}
                </p>
                <p className="text-sm text-slate-600">FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Code de parrainage optimisé */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-600" />
              Code de parrainage
            </CardTitle>
            <CardDescription>Partagez et gagnez 2000 FCFA par filleul</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Code cliquable */}
              <div 
                onClick={handleCopyReferralCode}
                className="bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 rounded-lg p-4 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Votre code</p>
                    <p className="text-2xl font-bold text-slate-900 font-mono">
                      {user.referralCode}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                    {copied ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-slate-600 group-hover:text-white" />
                    )}
                  </div>
                </div>
              </div>

              {/* Bouton partage WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Partager sur WhatsApp
              </button>

              {user.referredBy && (
                <p className="text-xs text-slate-500 flex items-center gap-1 justify-center">
                  <CheckCircle2 className="w-3 h-3" />
                  Parrainé par {user.referredBy}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bouton d'aide flottant (FAB) */}
      <button
        onClick={handleHelpRequest}
        className="fixed bottom-28 right-4 w-14 h-14 bg-green-500 active:bg-green-600 text-white rounded-full shadow-lg shadow-green-500/40 flex items-center justify-center active:scale-90 transition-all z-50"
        aria-label="Demander de l'aide"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
      </button>

    </div>
  );
}
