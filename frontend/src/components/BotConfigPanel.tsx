'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CustomModal } from '@/components/ui/custom-modal';
import {
  Bot,
  FileText,
  FilePlus,
  Trash2,
  Loader2,
  Upload,
  Save,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Search,
  ShieldBan,
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

const VECTORIZE_TIMEOUT_MS = 45_000;

interface KnowledgeDocument {
  id: string;
  name: string;
  type: 'PDF' | 'TEXT';
  createdAt: string;
}

interface Contact {
  id: string;
  pushName: string;
  profilePictureUrl?: string;
}

interface BotConfigPanelProps {
  instanceId: string;
  instanceName: string;
}

export default function BotConfigPanel({ instanceId, instanceName }: BotConfigPanelProps) {
  const { subscription } = useAuthStore();
  const canActivateBot = subscription?.status === 'PREMIUM' || subscription?.status === 'ASSISTANT' || subscription?.status === 'TRIAL';
  
  const [loading, setLoading] = useState(canActivateBot);
  const [saving, setSaving] = useState(false);
  const [isBotActive, setIsBotActive] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState<'PDF' | 'TEXT'>('TEXT');
  const [textName, setTextName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Blacklist state
  const [blacklistNumbers, setBlacklistNumbers] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [blacklistSearch, setBlacklistSearch] = useState('');
  const [savingBlacklist, setSavingBlacklist] = useState(false);

  useEffect(() => {
    if (instanceId && canActivateBot) {
      fetchBotConfig();
      fetchDocuments();
    }
  }, [instanceId, canActivateBot]);

  useEffect(() => {
    if (instanceId) {
      fetchBlacklist();
      fetchContacts();
    }
  }, [instanceId]);

  const fetchBlacklist = async () => {
    try {
      const response = await api.get(`/bot-config/${instanceId}/blacklist`);
      if (response.data.success) {
        setBlacklistNumbers(response.data.data.blacklist || []);
      }
    } catch (error: any) {
      console.error('Erreur récupération blacklist:', error);
    }
  };

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const response = await api.get(`/contacts/${instanceName}`);
      if (response.data.success) {
        setContacts(response.data.data.contacts || []);
      }
    } catch (error: any) {
      console.error('Erreur récupération contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const toggleBlacklistNumber = (numberId: string) => {
    const cleanNumber = numberId.replace('@s.whatsapp.net', '');
    setBlacklistNumbers(prev =>
      prev.includes(cleanNumber)
        ? prev.filter(n => n !== cleanNumber)
        : [...prev, cleanNumber]
    );
  };

  const handleSaveBlacklist = async () => {
    setSavingBlacklist(true);
    try {
      const response = await api.put(`/bot-config/${instanceId}/blacklist`, {
        blacklist: blacklistNumbers,
      });
      if (response.data.success) {
        toast.success(`Blacklist sauvegardée (${blacklistNumbers.length} numéros)`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSavingBlacklist(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const search = blacklistSearch.toLowerCase();
    if (!search) return true;
    const name = (contact.pushName || '').toLowerCase();
    const number = contact.id.replace('@s.whatsapp.net', '');
    return name.includes(search) || number.includes(search);
  });

  const fetchBotConfig = async () => {
    try {
      const response = await api.get(`/bot-config/${instanceId}/settings`);
      if (response.data.success) {
        const { systemPrompt, isBotActive, adminPhone } = response.data.data;
        setSystemPrompt(systemPrompt || '');
        setAdminPhone(adminPhone || '');
        // Forcer isBotActive à false si l'utilisateur n'a pas le droit d'activer le bot
        setIsBotActive(canActivateBot ? isBotActive : false);
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération de la config:', error);
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/bot-config/${instanceId}/knowledge`);
      if (response.data.success) {
        setDocuments(response.data.data.documents || []);
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération des documents:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Forcer isBotActive à false si le plan ne permet pas d'activer le bot
      const finalIsBotActive = canActivateBot ? isBotActive : false;
      
      const response = await api.put(`/bot-config/${instanceId}/settings`, {
        systemPrompt: systemPrompt.trim() || null,
        isBotActive: finalIsBotActive,
        adminPhone: adminPhone.trim() || null,
      });

      if (response.data.success) {
        toast.success('Paramètres sauvegardés avec succès');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de la sauvegarde';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTextDocument = async () => {
    console.log('[BotConfig] handleAddTextDocument appelé', { textName, textContent });
    
    if (!textName.trim() || !textContent.trim()) {
      toast.error('Le nom et le contenu sont requis');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('📝 Vectorisation du texte en cours...');
    
    try {
      console.log('[BotConfig] Envoi de la requête POST...');
      const response = await api.post(`/bot-config/${instanceId}/knowledge/text`, {
        name: textName.trim(),
        content: textContent.trim(),
      }, {
        timeout: VECTORIZE_TIMEOUT_MS,
      });

      console.log('[BotConfig] Réponse reçue:', response.data);

      if (response.data.success) {
        const { chunksCount, stats } = response.data.data;
        toast.success(
          `✅ Document texte vectorisé et ajouté avec succès !\n📊 ${chunksCount} chunks créés • ${stats?.totalWords || 0} mots`,
          { id: toastId, duration: 5000 }
        );
        await fetchDocuments();
        setShowAddDialog(false);
        setTextName('');
        setTextContent('');
      }
    } catch (error: any) {
      console.error('[BotConfig] Erreur:', error);
      const isTimeout = error?.code === 'ECONNABORTED';
      const errorMsg = isTimeout
        ? `⏱️ Le traitement prend trop de temps (> ${VECTORIZE_TIMEOUT_MS / 1000}s). Réessayez avec un texte plus court.`
        : error.response?.data?.error || 'Erreur lors de l\'ajout';
      toast.error(errorMsg, { id: toastId, duration: 5000 });
    } finally {
      setUploading(false);
    }
  };

  const handleAddPdfDocument = async () => {
    console.log('[BotConfig] handleAddPdfDocument appelé', { pdfFile });
    
    if (!pdfFile) {
      toast.error('Veuillez sélectionner un fichier PDF');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (pdfFile.size > maxSize) {
      toast.error('Le fichier ne doit pas dépasser 5 MB');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('📄 Analyse et vectorisation du PDF en cours...');
    
    try {
      console.log('[BotConfig] Préparation du FormData...');
      const formData = new FormData();
      formData.append('file', pdfFile);

      const response = await api.post(`/bot-config/${instanceId}/knowledge/pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: VECTORIZE_TIMEOUT_MS,
      });

      if (response.data.success) {
        const { chunksCount, stats, warning } = response.data.data;
        toast.success(
          `✅ PDF analysé et vectorisé avec succès !\n📊 ${chunksCount} chunks créés • ${stats?.totalWords || 0} mots • ${stats?.totalChars || 0} caractères`,
          { id: toastId, duration: 6000 }
        );

        if (warning) {
          toast.error(warning, { duration: 7000 });
        }

        await fetchDocuments();
        setShowAddDialog(false);
        setPdfFile(null);
      }
    } catch (error: any) {
      console.error('[BotConfig] Erreur upload:', error);
      const isTimeout = error?.code === 'ECONNABORTED';
      const errorMsg = isTimeout
        ? `⏱️ Le traitement prend trop de temps (> ${VECTORIZE_TIMEOUT_MS / 1000}s). Réessayez avec un PDF plus petit.`
        : error.response?.data?.error || 'Erreur lors de l\'upload';
      toast.error(errorMsg, { id: toastId, duration: 5000 });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string, documentName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${documentName}" ?`)) {
      return;
    }

    try {
      const response = await api.delete(`/bot-config/${instanceId}/knowledge/${documentId}`);

      if (response.data.success) {
        toast.success('Document supprimé avec succès');
        setDocuments(documents.filter(doc => doc.id !== documentId));
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de la suppression';
      toast.error(errorMsg);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête Compact */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Configuration</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Connectez WhatsApp et paramétrez votre IA.
        </p>
      </div>

      {/* AJOUT: Numéro Admin pour alertes */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-600" />
            <CardTitle className="text-sm font-semibold text-blue-900">Numéro Admin (Alertes IA)</CardTitle>
          </div>
          <CardDescription className="text-xs text-blue-700">
            Ce numéro recevra une notification WhatsApp si l'IA ne sait pas répondre à une question.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Input
              placeholder="Ex: 22670000000"
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value.replace(/[^0-9]/g, ''))}
              className="bg-white border-blue-200 focus-visible:ring-blue-500"
            />
            <p className="text-[10px] text-blue-600 italic">
              Entrez le numéro avec l'indicatif pays (ex: 226 pour le Burkina)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Carte 1 : Connexion WhatsApp */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Connexion WhatsApp</CardTitle>
              <CardDescription>Instance: {instanceName}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statut en évidence */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-sm font-medium text-slate-700">Statut</span>
            {isBotActive ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connecté
              </Badge>
            ) : (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                En attente
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Carte 3 : Comportement & Activation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Comportement & Activation</CardTitle>
              <CardDescription>Paramétrez votre assistant IA</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Activation du Bot - Version Explicite */}
          <div 
            className={`
              border-2 rounded-lg p-4 transition-all duration-200
              ${!canActivateBot
                ? 'bg-orange-50 border-orange-300'
                : isBotActive 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-red-50 border-red-300'
              }
            `}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {!canActivateBot ? (
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  ) : isBotActive ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <Label 
                    htmlFor="bot-active" 
                    className={`text-lg font-bold ${
                      !canActivateBot 
                        ? 'text-orange-900' 
                        : isBotActive 
                          ? 'text-green-900 cursor-pointer' 
                          : 'text-red-900 cursor-pointer'
                    }`}
                  >
                    {!canActivateBot 
                      ? '🚫 Bot Non Disponible' 
                      : isBotActive 
                        ? '🤖 Bot Activé' 
                        : '⏸️ Bot Désactivé'}
                  </Label>
                </div>
                <p className={`text-sm font-medium ${
                  !canActivateBot 
                    ? 'text-orange-800' 
                    : isBotActive 
                      ? 'text-green-800' 
                      : 'text-red-800'
                }`}>
                  {!canActivateBot
                    ? '⚠️ Le bot IA n\'est pas disponible avec votre plan actuel. Passez au plan Assistant IA ou Premium pour activer cette fonctionnalité.'
                    : isBotActive
                      ? '✅ Le bot répond automatiquement aux messages WhatsApp'
                      : '⚠️ Le bot ne répond pas aux messages - Activez-le pour qu\'il fonctionne'}
                </p>
              </div>
              <Switch
                id="bot-active"
                checked={canActivateBot ? isBotActive : false}
                onCheckedChange={(checked) => {
                  // Ne permettre le changement que pour les plans Premium et Assistant
                  if (canActivateBot) {
                    setIsBotActive(checked);
                  }
                }}
                disabled={!canActivateBot}
                className="data-[state=checked]:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Prompt Système */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt" className="text-base font-medium">
              Prompt Système
            </Label>
            <p className="text-sm text-muted-foreground">
              Définissez le comportement de votre bot IA
            </p>
            <Textarea
              id="system-prompt"
              placeholder="Exemple: Tu es un assistant commercial spécialisé dans la vente de produits électroniques..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="min-h-[120px] max-h-[250px] resize-none"
            />
          </div>

          {/* Bouton d'Action Pleine Largeur */}
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer la configuration
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Carte 4 : Base de Connaissances - Masquée pour DIFFUSION */}
      {canActivateBot && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Base de Connaissances</CardTitle>
                <CardDescription>
                  Documents utilisés par le bot
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
          {documents.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
              <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-slate-600 font-medium text-sm mb-1">Aucun document</p>
              <p className="text-xs text-slate-500">
                Ajoutez des documents pour enrichir le bot
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 min-h-[60px]"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      doc.type === 'PDF' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate text-sm">{doc.name}</p>
                      <p className="text-xs text-slate-500">
                        {doc.type} • {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDocument(doc.id, doc.name)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-10 w-10 p-0 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Bouton Ajouter en pleine largeur */}
          <Button 
            type="button"
            onClick={() => setShowAddDialog(true)}
            className="w-full h-12"
            variant="outline"
          >
            <FilePlus className="w-4 h-4 mr-2" />
            Ajouter un document
          </Button>
        </CardContent>
      </Card>
      )}

      {/* Carte 5 : Blacklist — disponible pour tous les plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ShieldBan className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Blacklist</CardTitle>
              <CardDescription>
                Numéros ignorés par le bot ({blacklistNumbers.length} sélectionné{blacklistNumbers.length !== 1 ? 's' : ''})
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par nom ou numéro..."
              value={blacklistSearch}
              onChange={(e) => setBlacklistSearch(e.target.value)}
              className="h-12 pl-10"
            />
          </div>

          {/* Liste des contacts */}
          {loadingContacts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-2 text-sm text-slate-500">Chargement des contacts...</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
              <ShieldBan className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-slate-600 font-medium text-sm mb-1">Aucun contact disponible</p>
              <p className="text-xs text-slate-500">
                Connectez votre instance WhatsApp pour voir vos contacts
              </p>
            </div>
          ) : (
            <div className="h-[250px] overflow-y-auto rounded-lg border border-slate-200">
              <div className="divide-y divide-slate-100">
                {filteredContacts.map((contact) => {
                  const cleanNumber = contact.id.replace('@s.whatsapp.net', '');
                  const isBlacklisted = blacklistNumbers.includes(cleanNumber);

                  return (
                    <label
                      key={contact.id}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors touch-manipulation ${
                        isBlacklisted
                          ? 'bg-red-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className={`font-semibold text-sm truncate ${isBlacklisted ? 'text-red-900' : 'text-slate-900'}`}>
                          {contact.pushName || 'Sans nom'}
                        </p>
                        <p className={`text-xs truncate ${isBlacklisted ? 'text-red-500' : 'text-slate-500'}`}>
                          +{cleanNumber}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isBlacklisted}
                        onChange={() => toggleBlacklistNumber(contact.id)}
                        className="h-5 w-5 shrink-0 rounded border-2 border-slate-300 accent-red-600 cursor-pointer"
                      />
                    </label>
                  );
                })}
                {filteredContacts.length === 0 && blacklistSearch && (
                  <div className="px-4 py-6 text-center text-sm text-slate-500">
                    Aucun contact ne correspond à &quot;{blacklistSearch}&quot;
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bouton Sauvegarder Blacklist */}
          <Button
            onClick={handleSaveBlacklist}
            disabled={savingBlacklist}
            variant="outline"
            className="w-full h-12 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            {savingBlacklist ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder la blacklist
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Modal Mobile-First */}
      {canActivateBot && (
      <CustomModal
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        title="Ajouter un document"
        description="Choisissez le type de document"
      >
        <div className="space-y-4">
          {/* Sélection du type */}
          <div className="flex gap-2">
            <Button
              variant={addType === 'TEXT' ? 'default' : 'outline'}
              onClick={() => setAddType('TEXT')}
              className="flex-1 h-12"
            >
              <FileText className="w-4 h-4 mr-2" />
              Texte
            </Button>
            <Button
              variant={addType === 'PDF' ? 'default' : 'outline'}
              onClick={() => setAddType('PDF')}
              className="flex-1 h-12"
            >
              <Upload className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>

          {/* Formulaire Texte */}
          {addType === 'TEXT' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-name">Nom du document</Label>
                <Input
                  id="text-name"
                  placeholder="Ex: FAQ Produits"
                  value={textName}
                  onChange={(e) => setTextName(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text-content">Contenu</Label>
                <Textarea
                  id="text-content"
                  placeholder="Saisissez le contenu du document..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="min-h-[120px] max-h-[250px] resize-none"
                />
              </div>
            </div>
          )}

          {/* Formulaire PDF */}
          {addType === 'PDF' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pdf-file">Fichier PDF (max 5 MB)</Label>
                <Input
                  id="pdf-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="h-12"
                />
                {pdfFile && (
                  <p className="text-sm text-slate-600">
                    {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    Le PDF sera vectorisé automatiquement
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Temps estimé : 10-30 secondes
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Boutons Mobile-First */}
          <div className="flex flex-col gap-2 mt-6">
            <Button
              type="button"
              onClick={() => {
                if (addType === 'TEXT') {
                  handleAddTextDocument();
                } else {
                  handleAddPdfDocument();
                }
              }}
              disabled={uploading || (addType === 'TEXT' && (!textName.trim() || !textContent.trim())) || (addType === 'PDF' && !pdfFile)}
              className="w-full h-12"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vectorisation...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Vectoriser et Ajouter
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTextName('');
                setTextContent('');
                setPdfFile(null);
                setShowAddDialog(false);
              }}
              className="w-full h-12"
            >
              Annuler
            </Button>
          </div>
        </div>
      </CustomModal>
      )}

    </div>
  );
}
