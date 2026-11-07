'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { 
  Users, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  Edit,
  Trash2,
  X,
  Save,
  DollarSign,
  Calendar,
  Phone,
  User,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

interface UserData {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  referralCode: string;
  referredBy: string | null;
  walletBalance: number;
  createdAt: string;
  subscription: {
    id: string;
    status: 'TRIAL' | 'DIFFUSION' | 'ASSISTANT' | 'PREMIUM' | 'EXPIRED';
    messageCount: number;
    trialEndsAt: string | null;
    nextBillingAt: string | null;
  } | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit modal state
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    subscriptionStatus: 'TRIAL' as 'TRIAL' | 'DIFFUSION' | 'ASSISTANT' | 'PREMIUM' | 'EXPIRED',
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete modal state
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/users');
      
      if (response.data.success) {
        setUsers(response.data.data.users || []);
      } else {
        setError('Erreur lors de la récupération des utilisateurs');
      }
    } catch (err: any) {
      console.error('Erreur API:', err);
      setError(err.response?.data?.error || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      subscriptionStatus: user.subscription?.status || 'TRIAL',
    });
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditForm({
      firstName: '',
      lastName: '',
      subscriptionStatus: 'TRIAL',
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      setIsSaving(true);
      
      const response = await api.put(`/admin/users/${editingUser.id}`, {
        firstName: editForm.firstName || null,
        lastName: editForm.lastName || null,
        subscriptionStatus: editForm.subscriptionStatus,
      });

      if (response.data.success) {
        toast.success('Utilisateur modifié avec succès');
        closeEditModal();
        await fetchUsers();
      }
    } catch (err: any) {
      console.error('Erreur modification:', err);
      toast.error(err.response?.data?.error || 'Erreur lors de la modification');
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (user: UserData) => {
    setDeletingUser(user);
  };

  const closeDeleteModal = () => {
    setDeletingUser(null);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      setIsDeleting(true);
      
      const response = await api.delete(`/admin/users/${deletingUser.id}`);

      if (response.data.success) {
        toast.success('Utilisateur supprimé avec succès');
        closeDeleteModal();
        await fetchUsers();
      }
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      toast.error(err.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      TRIAL: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      DIFFUSION: 'bg-blue-100 text-blue-700 border-blue-300',
      ASSISTANT: 'bg-purple-100 text-purple-700 border-purple-300',
      PREMIUM: 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 border-orange-300',
      EXPIRED: 'bg-red-100 text-red-700 border-red-300',
    };

    const labels = {
      TRIAL: '🎁 Essai gratuit',
      DIFFUSION: '📤 Diffusion (5k)',
      ASSISTANT: '🤖 Assistant IA (7.5k)',
      PREMIUM: '👑 Premium (10k)',
      EXPIRED: '❌ Expiré',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || styles.TRIAL}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getPaymentAmount = (user: UserData) => {
    if (!user.subscription) return 0;
    
    switch (user.subscription.status) {
      case 'DIFFUSION':
        return 5000;
      case 'ASSISTANT':
        return 7500;
      case 'PREMIUM':
        return 10000;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestion des Utilisateurs</h1>
          <p className="text-slate-600 mt-1">Liste complète des utilisateurs et leurs abonnements</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-900">{users.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Payants</p>
              <p className="text-2xl font-bold text-green-600">
                {users.filter(u => ['DIFFUSION', 'ASSISTANT', 'PREMIUM'].includes(u.subscription?.status || '')).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Trial</p>
              <p className="text-2xl font-bold text-yellow-600">
                {users.filter(u => u.subscription?.status === 'TRIAL').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Expirés</p>
              <p className="text-2xl font-bold text-red-600">
                {users.filter(u => u.subscription?.status === 'EXPIRED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Chargement des utilisateurs...</p>
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
                onClick={fetchUsers}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun utilisateur</h3>
          <p className="text-slate-600">La liste des utilisateurs apparaîtra ici.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Cagnotte
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Inscription
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-slate-900">
                          {user.lastName || user.firstName || 'Sans nom'}
                        </div>
                        <div className="text-sm text-slate-500">{user.phone}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          Code: {user.referralCode}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.subscription ? (
                        getStatusBadge(user.subscription.status)
                      ) : (
                        <span className="text-sm text-slate-400">Pas d'abonnement</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">
                          {getPaymentAmount(user).toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {user.subscription?.messageCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${user.walletBalance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {user.walletBalance.toLocaleString('fr-FR')} FCFA
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Edit className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Modifier l'utilisateur</h2>
                    <p className="text-blue-100 text-sm">{editingUser.phone}</p>
                  </div>
                </div>
                <button
                  onClick={closeEditModal}
                  disabled={isSaving}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-slate-900 mb-2">
                  Prénom
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  disabled={isSaving}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-slate-100"
                  placeholder="Prénom"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-slate-900 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  disabled={isSaving}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-slate-100"
                  placeholder="Nom"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-semibold text-slate-900 mb-2">
                  Statut d'abonnement
                </label>
                <select
                  id="status"
                  value={editForm.subscriptionStatus}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value as any })}
                  disabled={isSaving}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-slate-100"
                >
                  <option value="TRIAL">🎁 Essai gratuit</option>
                  <option value="DIFFUSION">📤 Diffusion (5 000 FCFA)</option>
                  <option value="ASSISTANT">🤖 Assistant IA (7 500 FCFA)</option>
                  <option value="PREMIUM">� Premium (10 000 FCFA)</option>
                  <option value="EXPIRED">❌ Expiré</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-6 rounded-b-2xl flex items-center justify-end gap-3">
              <button
                onClick={closeEditModal}
                disabled={isSaving}
                className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveUser}
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-3 rounded-lg">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Confirmer la suppression</h2>
                  <p className="text-red-100 text-sm">Action irréversible</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-slate-700 mb-4">
                Êtes-vous sûr de vouloir supprimer cet utilisateur ?
              </p>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-900">{deletingUser.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700">{deletingUser.lastName || deletingUser.firstName || 'Sans nom'}</span>
                </div>
              </div>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-red-800">
                  <strong>Attention :</strong> Cette action supprimera définitivement l'utilisateur et toutes ses données associées.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-6 rounded-b-2xl flex items-center justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Supprimer
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
