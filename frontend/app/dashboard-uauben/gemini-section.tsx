'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, Send, Bot, User, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function GeminiSection({ adminToken }: { adminToken: string | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [fileName, setFileName] = useState('');

  const headers = { Authorization: `Bearer ${adminToken}` };

  // ��── Upload PDF → Gemini lit ─────────────────────────────
  const handleFileSelect = async (file: File | null) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) { toast.error('PDF ou Image uniquement'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10 Mo'); return; }

    setLoading(true);
    setMessages([]);
    setSessionId(null);
    setFileName(file.name.replace(/\.[^/.]+$/, ''));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/backend/admin/documents/gemini-read', {
        method: 'POST', headers, body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
        setMessages([{ role: 'assistant', content: data.data.content }]);
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // ─── Envoyer une correction ──────────────────────────────
  const handleCorrect = async () => {
    if (!feedback.trim() || !sessionId) return;
    const userMsg = feedback.trim();
    setFeedback('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/backend/admin/documents/gemini-correct', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, feedback: userMsg }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.data.content }]);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setLoading(false);
    }
  };

  // ─── Valider et sauvegarder ──────────────────────────────
  const handleSave = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/backend/admin/documents/gemini-save', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Emploi du temps ajouté à la base ✅');
        setSessionId(null);
        setMessages([]);
        setFileName('');
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setSessionId(null);
    setMessages([]);
    setFileName('');
    setFeedback('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-100">
            <Bot className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-base">Import emploi du temps</CardTitle>
            <CardDescription>L'agent lit votre document — vous validez</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* Zone de chat */}
        <div className="flex-1 min-h-[300px] border border-slate-200 rounded-xl bg-slate-50 p-4 mb-4 overflow-y-auto space-y-3">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Upload className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm font-medium">Importer votre document ou photo</p>
              <p className="text-xs mt-1">Cliquez ci-dessous pour sélectionner un fichier (PDF ou photo)</p>
            </div>
          )}

          {loading && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-red-600" />
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-red-600 text-white rounded-br-sm'
                  : 'bg-white border border-slate-200 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && messages.length > 0 && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-red-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-xl rounded-bl-sm px-4 py-2.5">
                <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Zone de feedback + actions */}
        {sessionId && (
          <div className="space-y-3">
            {/* Bouton upload (si on veut changer de fichier) */}
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".pdf,image/png,image/jpeg,image/webp" className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4" /> Nouveau fichier (PDF/Image)
              </Button>
              <Button variant="ghost" size="sm" onClick={resetAll} className="text-red-500 hover:text-red-700">
                <X className="w-4 h-4" /> Annuler
              </Button>
              <Button onClick={handleSave} disabled={loading}
                className="ml-auto bg-green-600 hover:bg-green-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Valider et Enregistrer
              </Button>
            </div>

            {/* Input feedback */}
            <div className="flex gap-2">
              <input
                type="text"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCorrect()}
                placeholder="Une erreur ? Dites-le en français (ex: Anglais c'est jeudi)..."
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                disabled={loading}
              />
              <Button onClick={handleCorrect} disabled={loading || !feedback.trim()}
                className="bg-red-600 hover:bg-red-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Upload initial */}
        {!sessionId && !loading && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-red-300 hover:bg-slate-50 transition-all"
          >
            <input ref={fileInputRef} type="file" accept=".pdf,image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Importer votre document ou photo</p>
            <p className="text-xs text-slate-400 mt-1">PDF, Photo d'emploi du temps ou note (JPG, PNG) — 10 Mo max</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}