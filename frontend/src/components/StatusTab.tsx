'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import {
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Upload,
  Type,
  Image as ImageIcon,
  Video,
  Calendar,
  Info,
} from 'lucide-react';

interface ScheduledStatus {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO';
  content?: string;
  caption?: string;
  backgroundColor?: string;
  scheduledAt: string;
  status: 'PENDING' | 'POSTED' | 'FAILED';
  instanceName: string;
  instanceStatus: string;
  createdAt: string;
}

interface Instance {
  id: string;
  instanceName: string;
  status: string;
}

export default function StatusTab() {
  const token = useAuthStore((state) => state.token);
  const API_URL = '/api/backend';

  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<ScheduledStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    instanceId: '',
    type: 'TEXT' as 'TEXT' | 'IMAGE' | 'VIDEO',
    content: '',
    caption: '',
    backgroundColor: '#1b5583',
    scheduledAt: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchInstances();
      fetchStatuses();
    }
  }, [token]);

  // Auto-refresh every 10s
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(fetchStatuses, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchInstances = async () => {
    setLoadingInstances(true);
    try {
      const res = await fetch(`${API_URL}/instances/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInstances(data.data.instances || []);
      }
    } catch (err) {
      console.error('[StatusTab] Erreur instances:', err);
    } finally {
      setLoadingInstances(false);
    }
  };

  const fetchStatuses = async () => {
    try {
      setLoadingStatuses(true);
      const res = await fetch(`${API_URL}/status/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.data.statuses || []);
      }
    } catch (err) {
      console.error('[StatusTab] Erreur statuses:', err);
    } finally {
      setLoadingStatuses(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier dépasse 10 Mo');
      return;
    }

    // Validate format
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4'];
    if (!allowed.includes(file.type)) {
      toast.error('Format non accepté. Utilisez .jpg, .png ou .mp4');
      return;
    }

    setSelectedFile(file);

    // Preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const resetForm = () => {
    setFormData({
      instanceId: '',
      type: 'TEXT',
      content: '',
      caption: '',
      backgroundColor: '#1b5583',
      scheduledAt: '',
    });
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.instanceId || !formData.scheduledAt) {
      toast.error('Sélectionnez une instance et une date');
      return;
    }

    const scheduledDate = new Date(formData.scheduledAt);
    if (scheduledDate <= new Date()) {
      toast.error('La date doit être dans le futur');
      return;
    }

    if (formData.type === 'TEXT' && !formData.content.trim()) {
      toast.error('Le contenu texte est requis');
      return;
    }

    if ((formData.type === 'IMAGE' || formData.type === 'VIDEO') && !selectedFile) {
      toast.error('Un fichier média est requis');
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('instanceId', formData.instanceId);
      fd.append('type', formData.type);
      fd.append('scheduledAt', new Date(formData.scheduledAt).toISOString());

      if (formData.type === 'TEXT') {
        fd.append('content', formData.content);
        fd.append('backgroundColor', formData.backgroundColor);
      } else {
        if (selectedFile) fd.append('media', selectedFile);
        if (formData.caption) fd.append('caption', formData.caption);
      }

      const res = await fetch(`${API_URL}/status/schedule`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Statut programmé avec succès !');
        resetForm();
        fetchStatuses();
      } else {
        toast.error(data.error || 'Erreur lors de la programmation');
      }
    } catch (err) {
      console.error('[StatusTab] Erreur:', err);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce statut programmé ?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_URL}/status/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Statut supprimé');
        fetchStatuses();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: typeof Clock; label: string }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
      POSTED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Publié' },
      FAILED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Échoué' },
    };
    const badge = map[status] || map.PENDING;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const typeIcons: Record<string, typeof Type> = {
    TEXT: Type,
    IMAGE: ImageIcon,
    VIDEO: Video,
  };

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          <strong>Statuts WhatsApp :</strong> Programmez la publication automatique de statuts (stories) texte, image ou vidéo sur votre WhatsApp.
        </p>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          Programmer un statut
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Instance */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Instance WhatsApp
            </label>
            {loadingInstances ? (
              <div className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : instances.length === 0 ? (
              <div className="w-full px-4 py-3 border border-amber-300 rounded-lg bg-amber-50 text-amber-800 text-sm">
                Aucune instance disponible.{' '}
                <a href="/instances" className="underline font-medium">
                  Créez-en une
                </a>
              </div>
            ) : (
              <select
                value={formData.instanceId}
                onChange={(e) => setFormData({ ...formData, instanceId: e.target.value })}
                className="w-full px-4 py-3 md:py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm appearance-none bg-white cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem',
                }}
                required
              >
                <option value="">Sélectionnez une instance</option>
                {instances.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.instanceName} ({inst.status})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Type de statut
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['TEXT', 'IMAGE', 'VIDEO'] as const).map((t) => {
                const Icon = typeIcons[t];
                const labels: Record<string, string> = { TEXT: 'Texte', IMAGE: 'Image', VIDEO: 'Vidéo' };
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, type: t });
                      setSelectedFile(null);
                      setFilePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                      formData.type === t
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {labels[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenu selon le type */}
          {formData.type === 'TEXT' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Texte du statut
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Saisissez le texte de votre statut..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Couleur de fond
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.backgroundColor}
                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                    className="w-12 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  />
                  <span className="text-sm text-slate-500">{formData.backgroundColor}</span>
                  {/* Presets */}
                  <div className="flex gap-1.5 ml-2">
                    {['#1b5583', '#128c7e', '#075e54', '#25d366', '#4a1942', '#e74c3c', '#2c3e50'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({ ...formData, backgroundColor: c })}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                          formData.backgroundColor === c ? 'border-slate-900 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Upload fichier */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fichier {formData.type === 'IMAGE' ? 'image' : 'vidéo'}
                </label>
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? (
                    <div className="space-y-2">
                      {filePreview && (
                        <img
                          src={filePreview}
                          alt="Aperçu"
                          className="max-h-40 mx-auto rounded-lg object-contain"
                        />
                      )}
                      {formData.type === 'VIDEO' && selectedFile && (
                        <div className="flex items-center justify-center gap-2 text-emerald-700">
                          <Video className="w-8 h-8" />
                          <span className="text-sm font-medium">{selectedFile.name}</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-500">
                        {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo)
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setFilePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 text-slate-400 mx-auto" />
                      <p className="text-sm text-slate-600">
                        Cliquez pour sélectionner un fichier
                      </p>
                      <p className="text-xs text-red-500 font-medium">
                        Max 10 Mo. Formats : .jpg, .png, .mp4
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={formData.type === 'IMAGE' ? '.jpg,.jpeg,.png' : '.mp4'}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Légende (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  placeholder="Texte sous l'image ou la vidéo..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>
            </>
          )}

          {/* Date/Heure */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date et heure de publication
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              required
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Programmation en cours...
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5" />
                Programmer le statut
              </>
            )}
          </button>
        </form>
      </div>

      {/* Liste des statuts programmés */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-600" />
          Statuts programmés
        </h2>

        {loadingStatuses ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
            <p className="text-slate-500">Chargement...</p>
          </div>
        ) : statuses.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun statut programmé</p>
            <p className="text-sm text-slate-400">Programmez votre premier statut ci-dessus</p>
          </div>
        ) : (
          <div className="space-y-3">
            {statuses.map((s) => {
              const TypeIcon = typeIcons[s.type] || Type;
              return (
                <div
                  key={s.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        <TypeIcon className="w-3 h-3" />
                        {s.type}
                      </span>
                      <span className="text-sm text-slate-500">{s.instanceName}</span>
                    </div>
                    {getStatusBadge(s.status)}
                  </div>

                  {s.type === 'TEXT' && s.content && (
                    <div
                      className="rounded-lg p-3 mb-2 text-white text-sm"
                      style={{ backgroundColor: s.backgroundColor || '#1b5583' }}
                    >
                      {s.content.length > 120 ? `${s.content.slice(0, 120)}...` : s.content}
                    </div>
                  )}

                  {s.caption && (
                    <p className="text-sm text-slate-600 mb-2 italic">"{s.caption}"</p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(s.scheduledAt).toLocaleString('fr-FR')}
                    </div>

                    {s.status === 'PENDING' && (
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingId === s.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
