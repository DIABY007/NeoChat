'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Plus, Clock, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Annonce {
  id: string;
  message: string;
  expiresAt: string;
  createdAt: string;
  author: string;
}

export default function AnnoncesSection({ adminToken }: { adminToken: string | null }) {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [expiresIn, setExpiresIn] = useState('24');
  const [submitting, setSubmitting] = useState(false);
  const headers = { Authorization: `Bearer ${adminToken}` };

  const fetchAnnonces = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/backend/admin/annonces', { headers });
      const data = await res.json();
      if (data.success) setAnnonces(data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnnonces(); }, [adminToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) { toast.error('Message requis'); return; }
    setSubmitting(true);
    const expiresAt = new Date(Date.now() + parseInt(expiresIn) * 60 * 60 * 1000).toISOString();
    try {
      const res = await fetch('/api/backend/admin/annonces', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, expiresAt }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Annonce publiée ✅');
        setShowForm(false);
        setMessage('');
        fetchAnnonces();
      } else toast.error(data.error);
    } catch { toast.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Archiver cette annonce ?')) return;
    try {
      const res = await fetch(`/api/backend/admin/annonces/${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.success) { toast.success('Annonce archivée'); fetchAnnonces(); }
    } catch { toast.error('Erreur'); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100">
              <Megaphone className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Annonces express</CardTitle>
              <CardDescription>Messages temporaires visibles par le bot</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-4 h-4" />
            {showForm ? 'Fermer' : 'Créer'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <form onSubmit={handleCreate} className="space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Message de l'annonce..."
              className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none h-20"
              required
            />
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <select value={expiresIn} onChange={e => setExpiresIn(e.target.value)}
                className="text-sm border border-amber-200 rounded-lg px-2 py-1 outline-none bg-white">
                <option value="1">1 heure</option>
                <option value="6">6 heures</option>
                <option value="12">12 heures</option>
                <option value="24">24 heures</option>
                <option value="72">3 jours</option>
                <option value="168">7 jours</option>
              </select>
              <Button type="submit" disabled={submitting} size="sm" className="ml-auto bg-amber-600 hover:bg-amber-700 text-white">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                Publier
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
        ) : annonces.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune annonce active</p>
          </div>
        ) : (
          annonces.map(a => (
            <div key={a.id} className="flex items-start justify-between gap-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.message}</p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expire {formatDate(a.expiresAt)} — {a.author}
                </p>
              </div>
              <button onClick={() => handleArchive(a.id)} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}