'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { 
  TrendingUp, 
  Users, 
  Wifi, 
  Gift, 
  DollarSign, 
  AlertCircle,
  MessageSquare,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface Stats {
  revenue: {
    mrr: number;
    monthlyRevenue: number;
    totalDebt: number;
  };
  users: {
    total: number;
    active: number;
    trial: number;
    expired: number;
    newThisMonth: number;
    conversionRate: number;
  };
  instances: {
    total: number;
    connected: number;
    connectionRate: number;
  };
  affiliation: {
    ambassadors: number;
    totalReferrals: number;
    pendingPayouts: number;
    paidThisMonth: number;
  };
  messages: {
    total: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/stats/overview');
      
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setError('Erreur lors de la récupération des statistiques');
      }
    } catch (err: any) {
      console.error('Erreur API:', err);
      setError(err.response?.data?.error || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Erreur</h3>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Admin</h1>
          <p className="text-slate-600 mt-1">Vue d'ensemble des statistiques clés</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* KPIs Principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* MRR */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-sm font-medium">MRR</p>
              <p className="text-xs text-emerald-200">Revenus mensuels récurrents</p>
            </div>
          </div>
          <div className="text-4xl font-bold mb-2">
            {stats.revenue.mrr.toLocaleString('fr-FR')} FCFA
          </div>
          <div className="text-sm text-emerald-100">
            {stats.users.active} abonnements actifs × 10 000 FCFA
          </div>
        </div>

        {/* Abonnements Actifs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-slate-600 text-sm font-medium">Abonnements</p>
              <p className="text-xs text-slate-500">Actifs</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-slate-900 mb-2">
            {stats.users.active}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Taux de conversion:</span>
            <span className="font-semibold text-blue-600">
              {stats.users.conversionRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Dette Cagnottes */}
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-orange-100 text-sm font-medium">Cagnottes à payer</p>
              <p className="text-xs text-orange-200">Dette totale</p>
            </div>
          </div>
          <div className="text-4xl font-bold mb-2">
            {stats.revenue.totalDebt.toLocaleString('fr-FR')} FCFA
          </div>
          <div className="text-sm text-orange-100">
            {stats.affiliation.pendingPayouts.toLocaleString('fr-FR')} FCFA en attente
          </div>
        </div>
      </div>

      {/* Statistiques Détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Utilisateurs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 p-2.5 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Utilisateurs</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">
            {stats.users.total}
          </div>
          <div className="text-sm text-slate-500">
            +{stats.users.newThisMonth} ce mois
          </div>
        </div>

        {/* Instances Connectées */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-2.5 rounded-lg">
              <Wifi className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Instances</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">
            {stats.instances.connected}/{stats.instances.total}
          </div>
          <div className="text-sm text-slate-500">
            {stats.instances.connectionRate.toFixed(1)}% connectées
          </div>
        </div>

        {/* Ambassadeurs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-pink-100 p-2.5 rounded-lg">
              <Gift className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Ambassadeurs</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">
            {stats.affiliation.ambassadors}
          </div>
          <div className="text-sm text-slate-500">
            {stats.affiliation.totalReferrals} parrainages
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-100 p-2.5 rounded-lg">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Messages</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">
            {stats.messages.total.toLocaleString('fr-FR')}
          </div>
          <div className="text-sm text-slate-500">
            Total envoyés
          </div>
        </div>
      </div>

      {/* Détails Utilisateurs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Utilisateurs Trial</h3>
            <div className="bg-yellow-100 px-3 py-1 rounded-full">
              <span className="text-sm font-semibold text-yellow-700">{stats.users.trial}</span>
            </div>
          </div>
          <div className="text-sm text-slate-600">
            Période d'essai en cours
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Utilisateurs Actifs</h3>
            <div className="bg-green-100 px-3 py-1 rounded-full">
              <span className="text-sm font-semibold text-green-700">{stats.users.active}</span>
            </div>
          </div>
          <div className="text-sm text-slate-600">
            Abonnements payants
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Utilisateurs Expirés</h3>
            <div className="bg-red-100 px-3 py-1 rounded-full">
              <span className="text-sm font-semibold text-red-700">{stats.users.expired}</span>
            </div>
          </div>
          <div className="text-sm text-slate-600">
            Abonnements expirés
          </div>
        </div>
      </div>

      {/* Affiliation Détails */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Programme d'Affiliation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Revenus du mois</span>
              <span className="text-lg font-bold text-slate-900">
                {stats.revenue.monthlyRevenue.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Paiements effectués ce mois</span>
              <span className="text-lg font-bold text-slate-900">
                {stats.affiliation.paidThisMonth.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-red-600"
                style={{ 
                  width: stats.revenue.totalDebt > 0 
                    ? `${(stats.affiliation.paidThisMonth / stats.revenue.totalDebt) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
