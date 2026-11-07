'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { Copy, Check, Gift, Wallet, Users, Edit2, Save, X, Loader2, CreditCard, Calendar, TrendingUp, AlertCircle, Building2 } from 'lucide-react';
import api from '@/lib/axios';
import { analytics } from '@/lib/analytics';

export default function PartnerPage() {
  const { user, updateUser } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [editingReferralCode, setEditingReferralCode] = useState(false);
  const [newReferralCode, setNewReferralCode] = useState('');
  const [referralCodeLoading, setReferralCodeLoading] = useState(false);
  const [editingPaymentInfo, setEditingPaymentInfo] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState({
    name: user?.paymentName || '',
    phone: user?.paymentPhone || '',
    method: user?.paymentMethod || 'orange_money',
    otherMethod: user?.paymentOtherMethod || ''
  });
  const [paymentInfoLoading, setPaymentInfoLoading] = useState(false);
  const [stats, setStats] = useState({
    referralCount: 0,
    monthlyEarnings: 0,
    totalEarnings: 0,
  });
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://neochat.pro'}/auth/register?ref=${user?.referralCode}`;

  useEffect(() => {
    fetchAffiliateStats();
    fetchAffiliatePayments();
  }, []);

  const fetchAffiliateStats = async () => {
    try {
      const response = await api.get('/users/affiliate-stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAffiliatePayments = async () => {
    try {
      const response = await api.get('/users/affiliate-payments?limit=10');
      if (response.data.success) {
        setPayments(response.data.data.payments);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      analytics.trackReferralLinkCopied(
        user?.referralCode || '',
        stats.referralCount,
        user?.walletBalance || 0
      );
      toast.success('Lien de parrainage copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  const handleUpdateReferralCode = async () => {
    if (!newReferralCode.trim()) {
      toast.error('Veuillez entrer un code d\'affiliation');
      return;
    }

    setReferralCodeLoading(true);

    try {
      const response = await api.patch('/users/referral-code', {
        referralCode: newReferralCode,
      });

      if (response.data.success) {
        updateUser(response.data.data);
        toast.success('Code d\'affiliation mis à jour avec succès !');
        setEditingReferralCode(false);
        setNewReferralCode('');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de la mise à jour du code';
      toast.error(errorMsg);
    } finally {
      setReferralCodeLoading(false);
    }
  };

  const handleUpdatePaymentInfo = async () => {
    if (!paymentInfo.name.trim() || !paymentInfo.phone.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setPaymentInfoLoading(true);

    try {
      const response = await api.patch('/users/payment-info', paymentInfo);

      if (response.data.success) {
        updateUser(response.data.data);
        toast.success('Informations de paiement mises à jour !');
        setEditingPaymentInfo(false);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de la mise à jour';
      toast.error(errorMsg);
    } finally {
      setPaymentInfoLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          🌟 Espace Ambassadeur
        </h1>
        <p className="text-slate-600">
          Parrainez et gagnez des commissions
        </p>
      </div>

      {/* Cagnotte - Style gratifiant */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 md:p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-emerald-100 text-sm font-medium">
              Votre cagnotte
            </p>
            <p className="text-xs text-emerald-200">
              Gains accumulés
            </p>
          </div>
        </div>
        
        <div className="text-center py-4">
          <div className="text-5xl md:text-6xl font-bold mb-2">
            {user?.walletBalance?.toLocaleString('fr-FR') || '0'} FCFA
          </div>
          <p className="text-emerald-100 text-sm">
            🎉 Continue comme ça !
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {loadingStats ? (
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              ) : (
                stats.referralCount
              )}
            </div>
            <div className="text-xs text-emerald-100 mt-1">Parrainages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {loadingStats ? (
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              ) : (
                `${stats.monthlyEarnings.toLocaleString('fr-FR')} FCFA`
              )}
            </div>
            <div className="text-xs text-emerald-100 mt-1">Ce mois-ci</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {loadingStats ? (
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              ) : (
                `${stats.totalEarnings.toLocaleString('fr-FR')} FCFA`
              )}
            </div>
            <div className="text-xs text-emerald-100 mt-1">Total gagné</div>
          </div>
        </div>
      </div>

      {/* Code de parrainage */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-2.5 rounded-lg">
            <Gift className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">
              Votre code de parrainage
            </h2>
            <p className="text-sm text-slate-500">
              Partagez et gagnez 20% de commission
            </p>
          </div>
        </div>

        {/* Code */}
        {!editingReferralCode ? (
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-slate-500 mb-2">Votre code</div>
              <div className="text-2xl font-bold text-slate-900 tracking-wider mb-3">
                {user?.referralCode || 'XXXXXX'}
              </div>
              <button
                onClick={() => setEditingReferralCode(true)}
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition"
              >
                <Edit2 className="w-4 h-4" />
                Personnaliser mon code
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <div className="space-y-3">
              <div>
                <label htmlFor="newReferralCode" className="block text-sm font-medium text-slate-700 mb-2">
                  Nouveau code d'affiliation
                </label>
                <input
                  type="text"
                  id="newReferralCode"
                  value={newReferralCode}
                  onChange={(e) => setNewReferralCode(e.target.value.toUpperCase())}
                  placeholder="Ex: MONCODE2024"
                  maxLength={20}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900 font-mono text-center text-lg"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2 text-center">
                  4 à 20 caractères • Lettres majuscules et chiffres uniquement
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleUpdateReferralCode}
                  disabled={referralCodeLoading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 font-medium"
                >
                  {referralCodeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Enregistrer
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditingReferralCode(false);
                    setNewReferralCode('');
                  }}
                  disabled={referralCodeLoading}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lien de parrainage */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700">
            Lien de parrainage
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Copié</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copier</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Comment ça marche */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-100 p-2.5 rounded-lg">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="font-semibold text-slate-900">
            Comment ça marche ?
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-medium text-slate-900 mb-1">
                Partagez votre lien
              </h3>
              <p className="text-sm text-slate-600">
                Envoyez votre lien de parrainage à vos amis et contacts
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="font-medium text-slate-900 mb-1">
                Ils s'inscrivent
              </h3>
              <p className="text-sm text-slate-600">
                Vos filleuls créent leur compte avec votre code
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="font-medium text-slate-900 mb-1">
                Ils s'abonnent
              </h3>
              <p className="text-sm text-slate-600">
                Vos filleuls souscrivent à un abonnement avec 10% de remise
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
              4
            </div>
            <div>
              <h3 className="font-medium text-slate-900 mb-1">
                Vous gagnez 20%
              </h3>
              <p className="text-sm text-slate-600">
                Recevez 20% de commission chaque mois tant qu'ils restent abonnés
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              🎁 <strong>Avantage filleul :</strong> Vos filleuls bénéficient de 10% de remise sur tous leurs abonnements !
            </p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💰 <strong>Commission récurrente :</strong> Gagnez 20% chaque mois tant que votre filleul reste abonné. Les virements sont automatiques tous les lundis.
            </p>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              ⚠️ <strong>Important :</strong> Vous ne gagnez de commission que si votre filleul est abonné. Pas d'abonnement = pas de commission.
            </p>
          </div>
        </div>
      </div>

      {/* Informations de paiement */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2.5 rounded-lg">
              <CreditCard className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                Informations de paiement
              </h2>
              <p className="text-sm text-slate-500">
                Pour recevoir vos virements automatiques
              </p>
            </div>
          </div>
          {!editingPaymentInfo && (
            <button
              onClick={() => setEditingPaymentInfo(true)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <Edit2 className="w-4 h-4" />
              Modifier
            </button>
          )}
        </div>

        {!editingPaymentInfo ? (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Nom complet</p>
                  <p className="text-sm font-medium text-slate-900">
                    {user?.paymentName || 'Non renseigné'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Numéro</p>
                  <p className="text-sm font-medium text-slate-900">
                    {user?.paymentPhone || 'Non renseigné'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Moyen de paiement</p>
                  <p className="text-sm font-medium text-slate-900">
                    {user?.paymentMethod === 'orange_money' ? '🍊 Orange Money' : 
                     user?.paymentMethod === 'wave' ? '🌊 Wave' : 
                     user?.paymentMethod === 'bank_transfer' ? '🏦 Virement bancaire' : 
                     user?.paymentMethod === 'other' ? `📝 ${user?.paymentOtherMethod || 'Autre'}` :
                     'Non renseigné'}
                  </p>
                </div>
              </div>
            </div>
            {(!user?.paymentName || !user?.paymentPhone) && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Veuillez renseigner vos informations de paiement pour recevoir vos virements automatiques chaque lundi.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="paymentName" className="block text-sm font-medium text-slate-700 mb-2">
                Nom complet
              </label>
              <input
                type="text"
                id="paymentName"
                value={paymentInfo.name}
                onChange={(e) => setPaymentInfo({...paymentInfo, name: e.target.value})}
                placeholder="Ex: Jean Dupont"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="paymentPhone" className="block text-sm font-medium text-slate-700 mb-2">
                Numéro de téléphone / Compte
              </label>
              <input
                type="text"
                id="paymentPhone"
                value={paymentInfo.phone}
                onChange={(e) => setPaymentInfo({...paymentInfo, phone: e.target.value})}
                placeholder="Ex: +226 XX XX XX XX"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-slate-700 mb-2">
                Moyen de paiement souhaité
              </label>
              <select
                id="paymentMethod"
                value={paymentInfo.method}
                onChange={(e) => setPaymentInfo({...paymentInfo, method: e.target.value})}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-slate-900 bg-white"
              >
                <option value="orange_money">🍊 Orange Money</option>
                <option value="wave">🌊 Wave</option>
                <option value="bank_transfer">🏦 Virement bancaire</option>
                <option value="other">📝 Autre (à préciser)</option>
              </select>
            </div>

            {paymentInfo.method === 'other' && (
              <div>
                <label htmlFor="otherMethod" className="block text-sm font-medium text-slate-700 mb-2">
                  Précisez le moyen de paiement
                </label>
                <input
                  type="text"
                  id="otherMethod"
                  value={paymentInfo.otherMethod}
                  onChange={(e) => setPaymentInfo({...paymentInfo, otherMethod: e.target.value})}
                  placeholder="Ex: Moov Money, Coris Money..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-slate-900"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleUpdatePaymentInfo}
                disabled={paymentInfoLoading}
                className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 font-medium"
              >
                {paymentInfoLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setEditingPaymentInfo(false);
                  setPaymentInfo({
                    name: user?.paymentName || '',
                    phone: user?.paymentPhone || '',
                    method: user?.paymentMethod || 'orange_money',
                    otherMethod: user?.paymentOtherMethod || ''
                  });
                }}
                disabled={paymentInfoLoading}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historique des virements */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-teal-100 p-2.5 rounded-lg">
            <Calendar className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">
              Historique des virements
            </h2>
            <p className="text-sm text-slate-500">
              Virements automatiques tous les lundis
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium mb-1">Aucun virement pour le moment</p>
              <p className="text-sm text-slate-500">
                Vos virements apparaîtront ici dès que vos filleuls seront abonnés
              </p>
            </div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      payment.status === 'COMPLETED' ? 'bg-green-100' :
                      payment.status === 'PROCESSING' ? 'bg-blue-100' :
                      payment.status === 'PENDING' ? 'bg-orange-100' :
                      'bg-slate-100'
                    }`}>
                      <Building2 className={`w-5 h-5 ${
                        payment.status === 'COMPLETED' ? 'text-green-600' :
                        payment.status === 'PROCESSING' ? 'text-blue-600' :
                        payment.status === 'PENDING' ? 'text-orange-600' :
                        'text-slate-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {payment.status === 'COMPLETED' ? 'Virement reçu' :
                         payment.status === 'PROCESSING' ? 'En cours de traitement' :
                         payment.status === 'PENDING' ? 'En attente' :
                         'Virement'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(payment.createdAt).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      payment.status === 'COMPLETED' ? 'text-green-600' : 'text-slate-600'
                    }`}>
                      {payment.status === 'COMPLETED' ? '+' : ''} {payment.amount.toLocaleString('fr-FR')} FCFA
                    </p>
                    {payment.paymentMethod && (
                      <p className="text-xs text-slate-500">
                        {payment.paymentMethod === 'orange_money' ? '🍊 Orange Money' :
                         payment.paymentMethod === 'wave' ? '🌊 Wave' :
                         payment.paymentMethod === 'bank_transfer' ? '🏦 Virement' :
                         payment.paymentMethod}
                      </p>
                    )}
                  </div>
                </div>
                {payment.notes && (
                  <p className="text-xs text-slate-500 mt-2 pl-11">
                    Note: {payment.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
