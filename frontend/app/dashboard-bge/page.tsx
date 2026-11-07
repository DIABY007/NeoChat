'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Calendar,
  Megaphone,
  Clock,
  Upload,
  X,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Zap,
  CalendarDays,
  CalendarRange,
  CalendarPlus,
  Infinity as InfinityIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminAuthStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Annonce {
  id: string;
  title: string | null;
  type: 'EVENEMENT' | 'ANNONCE';
  message: string;
  fileUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  isExpired: boolean;
  createdByAdmin: {
    name: string | null;
    phoneNumber: string;
    role: string;
  };
}

type ExpirationOption = '24h' | 'dimanche' | '7j' | '1mois' | '3mois' | 'custom' | 'permanent';

export default function DashboardBGEPage() {
  const router = useRouter();
  const { adminToken, admin, logout } = useAdminAuthStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // États du formulaire
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'EVENEMENT' | 'ANNONCE'>('EVENEMENT');
  const [expirationMode, setExpirationMode] = useState<ExpirationOption>('7j');
  const [customExpiresAt, setCustomExpiresAt] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);

  // Rediriger si non connecté
  useEffect(() => {
    if (!adminToken) {
      router.push('/uauben-login');
      return;
    }
    fetchAnnonces();
  }, [adminToken]);

  const fetchAnnonces = async () => {
    if (!adminToken) return;
    setLoadingList(true);
    try {
      const res = await fetch('/api/backend/admin/bge/annonces', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setAnnonces(data.data);
      }
    } catch {
      toast.error('Erreur lors du chargement des annonces');
    } finally {
      setLoadingList(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop lourd (10 Mo maximum)');
      return;
    }

    setFile(selected);

    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() && !message.trim() && !file) {
      toast.error('Veuillez renseigner un titre, un message ou ajouter une affiche');
      return;
    }

    if (expirationMode === 'custom' && !customExpiresAt) {
      toast.error('Veuillez sélectionner une date personnalisée');
      return;
    }

    setLoading(true);
    const toastId = toast.loading(
      file
        ? 'Analyse et extraction par Gemini...'
        : 'Publication en cours...'
    );

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('type', type);
      formData.append('expirationMode', expirationMode);
      if (expirationMode === 'custom') {
        formData.append('customExpiresAt', customExpiresAt);
      }
      formData.append('message', message.trim());
      if (file) {
        formData.append('file', file);
      }

      const res = await fetch('/api/backend/admin/bge/annonces', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Annonce publiée et injectée dans le bot !', { id: toastId });
        // Réinitialiser le formulaire
        setTitle('');
        setMessage('');
        removeFile();
        setExpirationMode('7j');
        setCustomExpiresAt('');
        fetchAnnonces();
      } else {
        toast.error(data.error || 'Erreur lors de la publication', { id: toastId });
      }
    } catch {
      toast.error('Erreur de connexion au serveur', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette publication ? Elle ne sera plus proposée aux étudiants.')) return;

    try {
      const res = await fetch(`/api/backend/admin/bge/annonces/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Publication retirée');
        setAnnonces((prev) => prev.filter((a) => a.id !== id));
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur réseau');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/uauben-login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-uauben.png" alt="UAUBEN" className="h-9 w-auto object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-blue-950 text-sm sm:text-base leading-tight">Espace BGE</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                  Vie Étudiante & Événements
                </span>
              </div>
              <p className="text-xs text-slate-500">Publications officielles & IA WhatsApp</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-slate-600 font-medium hidden sm:inline">
              {admin?.name || admin?.phoneNumber}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs border-slate-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50"
            >
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formulaire de publication (Colonne gauche) */}
          <div className="lg:col-span-7">
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-gradient-to-r from-[#0d2347] via-[#1e3a8a] to-[#172554] text-white p-5 border-b-2 border-red-600">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-red-400" />
                  <CardTitle className="text-lg font-bold text-white">Nouvelle Annonce ou Événement</CardTitle>
                </div>
                <CardDescription className="text-blue-100/90 text-xs mt-1">
                  Injecté en temps réel dans le chatbot WhatsApp UAUBEN avec priorité institutionnelle.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Titre */}
                  <div>
                    <label className="block text-xs font-semibold text-blue-950 uppercase tracking-wider mb-1.5">
                      Titre de l'information <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Soirée d'intégration L1, Tournoi Inter-Filières, Vente de maillots..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                      required
                    />
                  </div>

                  {/* Type d'information (2 options : Rouge pour Événement, Bleu pour Annonce) */}
                  <div>
                    <label className="block text-xs font-semibold text-blue-950 uppercase tracking-wider mb-1.5">
                      Catégorie
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setType('EVENEMENT')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                          type === 'EVENEMENT'
                            ? 'bg-red-50 border-red-600 text-red-700 shadow-xs ring-1 ring-red-500'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-red-50/30 hover:border-red-200'
                        }`}
                      >
                        <Calendar className="w-4 h-4 text-red-600" />
                        <span>Événement / Soirée</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setType('ANNONCE')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                          type === 'ANNONCE'
                            ? 'bg-blue-50 border-blue-600 text-blue-800 shadow-xs ring-1 ring-blue-500'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50/30 hover:border-blue-200'
                        }`}
                      >
                        <Megaphone className="w-4 h-4 text-blue-600" />
                        <span>Annonce & Info</span>
                      </button>
                    </div>
                  </div>

                  {/* Délai d'expiration (TTL) */}
                  <div>
                    <label className="block text-xs font-semibold text-blue-950 uppercase tracking-wider mb-1.5">
                      Durée de validité (Délai d'expiration)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: '24h', label: '24 heures', icon: Zap },
                        { id: 'dimanche', label: 'Dimanche 23h59', icon: CalendarDays },
                        { id: '7j', label: '7 jours', icon: Clock },
                        { id: '1mois', label: '1 mois', icon: Calendar },
                        { id: '3mois', label: '3 mois', icon: CalendarRange },
                        { id: 'custom', label: 'Date personnalisée', icon: CalendarPlus },
                        { id: 'permanent', label: 'Permanent', icon: InfinityIcon },
                      ].map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setExpirationMode(opt.id as ExpirationOption)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              expirationMode === opt.id
                                ? 'bg-blue-700 border-blue-700 text-white shadow-xs ring-1 ring-blue-700'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50/40 hover:border-blue-300'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Champ date personnalisée */}
                    {expirationMode === 'custom' && (
                      <div className="mt-3">
                        <input
                          type="datetime-local"
                          value={customExpiresAt}
                          onChange={(e) => setCustomExpiresAt(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Contenu textuel */}
                  <div>
                    <label className="block text-xs font-semibold text-blue-950 uppercase tracking-wider mb-1.5">
                      Détails / Message
                    </label>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Décris les détails : date exacte, heure, lieu, tarif du ticket, contact pour s'inscrire, programme..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all resize-y"
                    />
                  </div>

                  {/* Fichier joint (Affiche Image ou PDF) */}
                  <div>
                    <label className="block text-xs font-semibold text-blue-950 uppercase tracking-wider mb-1.5">
                      Affiche / Flyer ou Document PDF <span className="text-slate-400 font-normal">(Optionnel)</span>
                    </label>

                    {!file ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-blue-600 rounded-xl p-4 text-center cursor-pointer transition-all bg-slate-50 hover:bg-blue-50/30 group"
                      >
                        <Upload className="w-6 h-6 mx-auto text-slate-400 group-hover:text-blue-600 transition-colors mb-1" />
                        <p className="text-xs font-medium text-slate-700">
                          Clique pour ajouter un flyer (JPG, PNG) ou un PDF
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Gemini Vision extrait automatiquement le texte et les dates (Max 10 Mo)</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {filePreview ? (
                            <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-blue-200" />
                          ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-blue-700" />
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <p className="text-xs font-semibold text-blue-950 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={removeFile} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Bouton de soumission */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:to-blue-900 text-white font-semibold py-3 rounded-xl shadow-md shadow-blue-950/15 border border-blue-900 active:scale-[0.99] transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Traitement par l'IA en cours...
                      </>
                    ) : (
                      'Publier et Activer sur le Chatbot WhatsApp'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Liste des annonces actives (Colonne droite) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-blue-950">Publications actives</h2>
                <p className="text-xs text-slate-500">Prises en compte en direct par le bot</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                {annonces.filter((a) => !a.isExpired).length} active{annonces.filter((a) => !a.isExpired).length > 1 ? 's' : ''}
              </span>
            </div>

            {loadingList ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-xs text-slate-500">Chargement des publications...</p>
              </div>
            ) : annonces.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200">
                <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Aucune annonce pour le moment</p>
                <p className="text-xs text-slate-400 mt-1">Publie un premier événement pour alimenter le bot WhatsApp.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                {annonces.map((a) => (
                  <div
                    key={a.id}
                    className={`bg-white rounded-xl p-4 border transition-all shadow-xs ${
                      a.isExpired ? 'border-slate-200 opacity-60 bg-slate-50/80' : 'border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${
                              a.type === 'EVENEMENT'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {a.type === 'EVENEMENT' ? (
                              <>
                                <Calendar className="w-3 h-3 text-red-600" />
                                <span>Événement</span>
                              </>
                            ) : (
                              <>
                                <Megaphone className="w-3 h-3 text-blue-600" />
                                <span>Annonce</span>
                              </>
                            )}
                          </span>

                          {a.isExpired ? (
                            <span className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Expiré
                            </span>
                          ) : a.expiresAt ? (
                            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Expire le {new Date(a.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-blue-700 font-bold inline-flex items-center gap-1">
                              <InfinityIcon className="w-3 h-3" />
                              <span>Permanent</span>
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm leading-snug">
                          {a.title || 'Information BGE'}
                        </h3>
                      </div>

                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                        title="Archiver l'annonce"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {a.message}
                    </p>

                    {a.fileUrl && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <a
                          href={a.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <ExternalLink className="w-3 h-3" /> Voir le document joint
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
