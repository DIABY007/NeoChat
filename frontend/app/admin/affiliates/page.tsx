'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { 
  Gift, 
  Wallet, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  DollarSign,
  CheckCircle,
  X,
  Calendar,
  User,
  Phone,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

interface Ambassador {
  id: string;
  phone: string;
  lastName: string | null;
  referralCode: string;
  walletBalance: number;
  paymentName: string | null;
  paymentPhone: string | null;
  paymentMethod: string | null;
  referralsCount: number;
  paymentsCount: number;
  createdAt: string;
}

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDetails: string | null;
  status: string;
  processedBy: string | null;
  processedAt: string | null;
  notes: string | null;
  createdAt: string;
  ambassador: {
    id: string;
    phone: string;
    lastName: string | null;
    referralCode: string;
    currentBalance: number;
  };
}

export default function AffiliatesPage() {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ambassadors' | 'history'>('ambassadors');
  
  // Modal state
  const [selectedAmbassador, setSelectedAmbassador] = useState<Ambassador | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchAmbassadors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/affiliates?minBalance=0');
      
      if (response.data.success) {
        setAmbassadors(response.data.data.ambassadors);
      } else {
        setError('Erreur lors de la récupération des ambassadeurs');
      }
    } catch (err: any) {
      console.error('Erreur API:', err);
      setError(err.response?.data?.error || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true);
      const response = await api.get('/admin/affiliates/payments/history?limit=50');
      
      if (response.data.success) {
        setPayments(response.data.data.payments);
      }
    } catch (err: any) {
      console.error('Erreur API historique:', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    fetchAmbassadors();
    fetchPayments();
  }, []);

  const openPaymentModal = (ambassador: Ambassador) => {
    setSelectedAmbassador(ambassador);
    setPaymentAmount(ambassador.walletBalance.toString());
    setPaymentNotes('');
  };

  const closePaymentModal = () => {
    setSelectedAmbassador(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handlePayment = async () => {
    if (!selectedAmbassador) return;

    const amount = parseFloat(paymentAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Le montant doit être un nombre positif');
      return;
    }

    if (amount > selectedAmbassador.walletBalance) {
      toast.error('Le montant dépasse le solde disponible');
      return;
    }

    try {
      setIsProcessing(true);
      
      const response = await api.post(
        `/admin/affiliates/${selectedAmbassador.id}/declare-payment`,
        {
          amount,
          notes: paymentNotes || null,
        }
      );

      if (response.data.success) {
        toast.success(`Paiement de ${amount.toLocaleString('fr-FR')} FCFA déclaré avec succès !`);
        closePaymentModal();
        
        // Rafraîchir les données
        await fetchAmbassadors();
        await fetchPayments();
      }
    } catch (err: any) {
      console.error('Erreur paiement:', err);
      toast.error(err.response?.data?.error || 'Erreur lors de la déclaration du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  const getPaymentMethodLabel = (method: string | null, otherMethod?: string | null) => {
    if (!method) return 'Non renseigné';
    
    switch (method) {
      case 'orange_money':
        return '🍊 Orange Money';
      case 'wave':
        return '🌊 Wave';
      case 'bank_transfer':
        return '🏦 Virement bancaire';
      case 'other':
        return `📝 ${otherMethod || 'Autre'}`;
      default:
        return method;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      COMPLETED: 'bg-green-100 text-green-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      PROCESSING: 'bg-blue-100 text-blue-700',
      FAILED: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
    };

    const labels = {
      COMPLETED: 'Effectué',
      PENDING: 'En attente',
      PROCESSING: 'En cours',
      FAILED: 'Échoué',
      CANCELLED: 'Annulé',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || styles.PENDING}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestion des Ambassadeurs</h1>
          <p className="text-slate-600 mt-1">Paiements et historique des commissions</p>
        </div>
        <button
          onClick={() => {
            fetchAmbassadors();
            fetchPayments();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('ambassadors')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'ambassadors'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Ambassadeurs à payer
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Historique des paiements
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'ambassadors' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Chargement des ambassadeurs...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Erreur</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                  <button
                    onClick={fetchAmbassadors}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          ) : ambassadors.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
              <Wallet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun ambassadeur à payer</h3>
              <p className="text-slate-600">Tous les ambassadeurs ont été payés ou n'ont pas encore de commission.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Ambassadeur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Solde
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Infos Paiement
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Statistiques
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ambassadors.map((ambassador) => (
                      <tr key={ambassador.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900">
                              {ambassador.lastName || 'Sans nom'}
                            </div>
                            <div className="text-sm text-slate-500">{ambassador.phone}</div>
                            <div className="text-xs text-slate-400 mt-1">
                              Code: {ambassador.referralCode}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-emerald-600 text-lg">
                              {ambassador.walletBalance.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {ambassador.paymentPhone && ambassador.paymentMethod ? (
                            <div className="space-y-1">
                              <div className="text-sm text-slate-900">
                                {ambassador.paymentName || 'Non renseigné'}
                              </div>
                              <div className="text-sm text-slate-600">
                                {ambassador.paymentPhone}
                              </div>
                              <div className="text-xs text-slate-500">
                                {getPaymentMethodLabel(ambassador.paymentMethod)}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-amber-600">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm">Non renseigné</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-sm">
                            <div className="text-slate-600">
                              {ambassador.referralsCount} filleul{ambassador.referralsCount > 1 ? 's' : ''}
                            </div>
                            <div className="text-slate-500">
                              {ambassador.paymentsCount} paiement{ambassador.paymentsCount > 1 ? 's' : ''}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openPaymentModal(ambassador)}
                            disabled={!ambassador.paymentPhone || !ambassador.paymentMethod || ambassador.walletBalance === 0}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none font-medium text-sm"
                          >
                            Payer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {paymentsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Chargement de l'historique...</p>
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun paiement enregistré</h3>
              <p className="text-slate-600">L'historique des paiements apparaîtra ici.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Ambassadeur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Moyen de paiement
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">
                            {new Date(payment.processedAt || payment.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(payment.processedAt || payment.createdAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900">
                              {payment.ambassador.lastName || 'Sans nom'}
                            </div>
                            <div className="text-sm text-slate-500">{payment.ambassador.phone}</div>
                            <div className="text-xs text-slate-400">
                              Solde actuel: {payment.ambassador.currentBalance.toLocaleString('fr-FR')} FCFA
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-emerald-600">
                              {payment.amount.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm text-slate-900">
                              {getPaymentMethodLabel(payment.paymentMethod)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {payment.paymentDetails}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600 max-w-xs truncate">
                            {payment.notes || '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {selectedAmbassador && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Déclarer un paiement</h2>
                    <p className="text-emerald-100 text-sm">Transaction sécurisée</p>
                  </div>
                </div>
                <button
                  onClick={closePaymentModal}
                  disabled={isProcessing}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Ambassador Info */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informations de l'ambassadeur
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Nom</p>
                    <p className="font-medium text-slate-900">{selectedAmbassador.lastName || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Téléphone</p>
                    <p className="font-medium text-slate-900">{selectedAmbassador.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Code de parrainage</p>
                    <p className="font-mono font-medium text-slate-900">{selectedAmbassador.referralCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Filleuls</p>
                    <p className="font-medium text-slate-900">{selectedAmbassador.referralsCount}</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Informations de paiement
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Nom bénéficiaire</p>
                    <p className="font-medium text-slate-900">{selectedAmbassador.paymentName || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Numéro</p>
                    <p className="font-medium text-slate-900">{selectedAmbassador.paymentPhone || 'Non renseigné'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 mb-1">Moyen de paiement</p>
                    <p className="font-medium text-slate-900">{getPaymentMethodLabel(selectedAmbassador.paymentMethod)}</p>
                  </div>
                </div>
              </div>

              {/* Current Balance */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-700 font-medium mb-1">Solde actuel</p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {selectedAmbassador.walletBalance.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <Wallet className="w-12 h-12 text-emerald-600/20" />
                </div>
              </div>

              {/* Payment Amount Input */}
              <div>
                <label htmlFor="paymentAmount" className="block text-sm font-semibold text-slate-900 mb-2">
                  Montant à payer <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="paymentAmount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-slate-900 font-semibold text-lg disabled:bg-slate-100 disabled:cursor-not-allowed"
                    placeholder="0"
                    min="0"
                    max={selectedAmbassador.walletBalance}
                    step="1"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                    FCFA
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Maximum: {selectedAmbassador.walletBalance.toLocaleString('fr-FR')} FCFA
                </p>
              </div>

              {/* Notes Input */}
              <div>
                <label htmlFor="paymentNotes" className="block text-sm font-semibold text-slate-900 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  id="paymentNotes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  disabled={isProcessing}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed resize-none"
                  placeholder="Ajouter une note sur ce paiement..."
                />
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Attention</p>
                    <p>
                      Cette action va déduire <strong>{parseFloat(paymentAmount || '0').toLocaleString('fr-FR')} FCFA</strong> de la cagnotte de l'ambassadeur.
                      Le nouveau solde sera de <strong>{(selectedAmbassador.walletBalance - parseFloat(paymentAmount || '0')).toLocaleString('fr-FR')} FCFA</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-6 rounded-b-2xl flex items-center justify-end gap-3">
              <button
                onClick={closePaymentModal}
                disabled={isProcessing}
                className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handlePayment}
                disabled={isProcessing || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirmer le paiement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
