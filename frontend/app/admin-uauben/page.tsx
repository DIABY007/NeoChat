'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, UserPlus, Users, Loader2, AlertCircle, CheckCircle2, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminAuthStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AdminUser {
  id: string;
  role: 'SUPER_ADMIN' | 'COORDINATEUR' | 'BGE';
  phoneNumber: string;
  name: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  _count: { uploadedDocs?: number; annonces: number };
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COORDINATEUR: 'Coordinateur',
  BGE: 'Membre BGE',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  COORDINATEUR: 'bg-blue-100 text-blue-700',
  BGE: 'bg-emerald-100 text-emerald-700',
};

export default function AdminUAUBENPage() {
  const router = useRouter();
  const { adminToken, admin, logout } = useAdminAuthStore();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ phoneNumber: '', name: '', role: 'COORDINATEUR' });

  useEffect(() => {
    if (!adminToken || !admin) return;
    setLoading(true);
    setErrorMsg(null);
    fetchAdmins(adminToken).catch((err) => {
      setErrorMsg(err.message || 'Erreur inconnue');
      setAccessDenied(true);
    }).finally(() => setLoading(false));
  }, [adminToken, admin]);

  const fetchAdmins = async (token: string | null) => {
    if (!token) throw new Error('Pas de token');
    const res = await fetch('/api/backend/admin/admins', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
    }
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erreur API');
    setAdmins(data.data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phoneNumber || form.phoneNumber.length < 8) {
      toast.error('Numéro de téléphone invalide');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/backend/admin/admins', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Admin ${form.name || form.phoneNumber} créé ✅`);
        setShowForm(false);
        fetchAdmins(adminToken);
      } else {
        toast.error(data.error || 'Erreur création');
      }
    } catch { toast.error('Erreur de connexion'); }
    finally { setSubmitting(false); }
  };

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Archiver ${name} ?`)) return;
    try {
      const res = await fetch(`/api/backend/admin/admins/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
      const data = await res.json();
      if (data.success) { toast.success('Admin archivé'); fetchAdmins(adminToken); }
      else toast.error(data.error);
    } catch { toast.error('Erreur'); }
  };

  if (!adminToken) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Accès restreint</h1>
        <p className="text-slate-500 mb-6">Connectez-vous avec un compte administrateur.</p>
        <a href="/uauben-login" className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
          Se connecter
        </a>
      </div>
    </div>
  );

  if (accessDenied) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Accès refusé</h1>
        <p className="text-slate-500 mb-6">Cette page est réservée aux Super Administrateurs.</p>
        {errorMsg && <p className="text-xs text-red-500 mb-4 bg-red-50 px-3 py-2 rounded-lg">{errorMsg}</p>}
        <a href="/dashboard-uauben" className="inline-block px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium">
          Retour au dashboard
        </a>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-uauben.png" alt="UAUBEN" className="h-8" />
            <div>
              <h1 className="font-semibold text-slate-900">Gestion des administrateurs</h1>
              <p className="text-xs text-slate-500">Super Admin — {admin?.name || admin?.phoneNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard-uauben')}>
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { logout(); router.push('/uauben-login'); }}>Déconnexion</Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Bouton ajouter */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">
            {admins.length} administrateur{admins.length > 1 ? 's' : ''}
          </h2>
          <Button onClick={() => setShowForm(!showForm)} className="bg-red-600 hover:bg-red-700 text-white">
            <UserPlus className="w-4 h-4" />
            {showForm ? 'Fermer' : 'Nouvel admin'}
          </Button>
        </div>

        {/* Formulaire création */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nouvel administrateur</CardTitle>
              <CardDescription>L'admin recevra un code OTP sur son WhatsApp à la première connexion</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone *</label>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-red-500 focus-within:bg-white">
                      <span className="px-2.5 py-2 bg-slate-100 text-slate-700 text-xs font-bold border-r border-slate-200 flex items-center gap-1 select-none">
                        <span>🇧🇫</span> +226
                      </span>
                      <input
                        type="tel"
                        value={form.phoneNumber.replace(/^\+226/, '').replace(/^00226/, '').replace(/^226/, '')}
                        onChange={e => {
                          const val = e.target.value.replace(/^\+226/, '').replace(/^00226/, '').replace(/^226/, '').replace(/\D/g, '');
                          setForm(f => ({ ...f, phoneNumber: val ? `+226${val}` : '' }));
                        }}
                        placeholder="XX XX XX XX"
                        className="w-full px-2.5 py-2 text-sm outline-none bg-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Prénom Nom"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                    <select
                      value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white"
                    >
                      <option value="COORDINATEUR">Coordinateur</option>
                      <option value="BGE">Membre BGE</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                  <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Créer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Liste des admins */}
        <div className="space-y-3">
          {admins.map(a => (
            <Card key={a.id} className={`${a.status === 'ARCHIVED' ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${ROLE_COLORS[a.role] || 'bg-slate-100 text-slate-600'}`}>
                      {a.name ? a.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{a.name || 'Sans nom'}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[a.role]}`}>
                          {ROLE_LABELS[a.role]}
                        </span>
                        {a.status === 'ARCHIVED' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                            Archivé
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{a.phoneNumber}</p>
                      <p className="text-xs text-slate-400">
                        Créé le {new Date(a.createdAt).toLocaleDateString('fr-FR')} · {a._count.annonces || 0} annonce{(a._count.annonces || 0) > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {a.status === 'ACTIVE' && a.id !== admin?.id && (
                    <Button variant="outline" size="sm" onClick={() => handleArchive(a.id, a.name || a.phoneNumber)}>
                      Archiver
                    </Button>
                  )}
                  {a.id === admin?.id && (
                    <span className="text-xs text-slate-400 italic">Vous</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}