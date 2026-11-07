'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Send, Calendar, Users, Clock, CheckCircle, XCircle, Loader2, Info, Search, Star, Filter, Copy, Edit, Trash2, Pause, Play, MoreVertical, MessageSquare, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ui/image-upload';
import { analytics } from '@/lib/analytics';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import StatusTab from '@/components/StatusTab';

interface Campaign {
  id: string;
  name: string;
  instanceName: string;
  recipientsCount: number;
  processedCount: number;
  scheduledAt: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED' | 'PROCESSING';
  createdAt: string;
  message?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
}

interface Instance {
  instanceName: string;
  status: string;
}

interface Contact {
  id: string;
  pushName: string;
  profilePictureUrl?: string;
}

interface Group {
  id: string;
  subject: string;
  size: number;
}

export default function BroadcastPage() {
  const token = useAuthStore((state) => state.token);
  const subscription = useAuthStore((state) => state.subscription);
  const API_URL = '/api/backend';
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteContacts, setFavoriteContacts] = useState<string[]>([]);
  const [favoriteGroups, setFavoriteGroups] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  
  const [formData, setFormData] = useState({
    instanceName: '',
    name: '',
    message: '',
    scheduledAt: '',
    mediaUrl: '',
    mediaType: '' as 'image' | 'video' | 'document' | '',
  });

  const [showSpintaxHelp, setShowSpintaxHelp] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchInstances();
      fetchCampaigns();
    }
    loadFavoritesFromStorage();
  }, [token]);

  // Rafraîchissement automatique des campagnes toutes les 5 secondes
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(() => {
      fetchCampaigns();
    }, 5000);

    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    saveFavoritesToStorage();
  }, [favoriteContacts, favoriteGroups]);

  const loadFavoritesFromStorage = () => {
    try {
      const savedFavoriteContacts = localStorage.getItem('favoriteContacts');
      const savedFavoriteGroups = localStorage.getItem('favoriteGroups');
      if (savedFavoriteContacts) setFavoriteContacts(JSON.parse(savedFavoriteContacts));
      if (savedFavoriteGroups) setFavoriteGroups(JSON.parse(savedFavoriteGroups));
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
    }
  };

  const saveFavoritesToStorage = () => {
    try {
      localStorage.setItem('favoriteContacts', JSON.stringify(favoriteContacts));
      localStorage.setItem('favoriteGroups', JSON.stringify(favoriteGroups));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des favoris:', error);
    }
  };

  const toggleFavoriteContact = (contactId: string) => {
    setFavoriteContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleFavoriteGroup = (groupId: string) => {
    setFavoriteGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      (contact.pushName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      contact.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorites = !showOnlyFavorites || favoriteContacts.includes(contact.id);
    return matchesSearch && matchesFavorites;
  });

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorites = !showOnlyFavorites || favoriteGroups.includes(group.id);
    return matchesSearch && matchesFavorites;
  });

  const fetchInstances = async () => {
    setLoadingInstances(true);
    try {
      const response = await fetch(`${API_URL}/instances/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const instancesList = data.data.instances || [];
        setInstances(instancesList);
        console.log('[Broadcast] Instances chargées:', instancesList.length);
        console.log('[Broadcast] Données reçues:', data);
      } else {
        console.error('[Broadcast] Erreur API instances:', response.status);
        toast.error('Impossible de charger les instances');
        setInstances([]);
      }
    } catch (error) {
      console.error('[Broadcast] Erreur lors du chargement des instances:', error);
      toast.error('Erreur de connexion au serveur');
      setInstances([]);
    } finally {
      setLoadingInstances(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      const response = await fetch(`${API_URL}/campaigns/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.data.campaigns || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des campagnes:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const fetchContactsAndGroups = async (instanceName: string) => {
    if (!instanceName) return;
    
    setLoadingContacts(true);
    try {
      const response = await fetch(
        `${API_URL}/contacts/${instanceName}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setContacts(data.data.contacts || []);
        setGroups(data.data.groups || []);
      } else {
        toast.error('Impossible de charger les contacts');
        setContacts([]);
        setGroups([]);
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
      setContacts([]);
      setGroups([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.instanceName || !formData.name || !formData.message || !formData.scheduledAt) {
      toast.error('Tous les champs sont requis');
      return;
    }

    const allRecipients = [...selectedContacts, ...selectedGroups];

    if (allRecipients.length === 0) {
      toast.error('Veuillez sélectionner au moins un destinataire');
      return;
    }

    setLoading(true);
    analytics.trackCampaignCreationStarted(formData.instanceName, campaigns.length);

    try {
      const response = await fetch(`${API_URL}/campaigns/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          instanceName: formData.instanceName,
          name: formData.name,
          message: formData.message,
          recipients: allRecipients,
          scheduledAt: new Date(formData.scheduledAt).toISOString(),
          mediaUrl: formData.mediaUrl || undefined,
          mediaType: formData.mediaType || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        analytics.trackCampaignCreatedSuccess({
          instanceName: formData.instanceName,
          totalCount: allRecipients.length,
          mediaUrl: formData.mediaUrl || undefined,
          mediaType: formData.mediaType || undefined,
          scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt) : undefined,
          message: formData.message,
        });
        toast.success(`Campagne créée ! ${allRecipients.length} destinataires`);
        setFormData({
          instanceName: '',
          name: '',
          message: '',
          scheduledAt: '',
          mediaUrl: '',
          mediaType: '',
        });
        setSelectedContacts([]);
        setSelectedGroups([]);
        setContacts([]);
        setGroups([]);
        fetchCampaigns();
      } else {
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateCampaign = async (campaignId: string) => {
    setActionLoading(campaignId);
    try {
      const response = await fetch(`${API_URL}/campaigns/${campaignId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Campagne dupliquée avec succès');
        fetchCampaigns();
      } else {
        toast.error(data.error || 'Erreur lors de la duplication');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) {
      return;
    }

    setActionLoading(campaignId);
    try {
      const response = await fetch(`${API_URL}/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Campagne supprimée avec succès');
        fetchCampaigns();
      } else {
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    setActionLoading(campaignId);
    try {
      const response = await fetch(`${API_URL}/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Campagne mise en pause');
        fetchCampaigns();
      } else {
        toast.error(data.error || 'Erreur lors de la mise en pause');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    setActionLoading(campaignId);
    try {
      const response = await fetch(`${API_URL}/campaigns/${campaignId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Campagne reprise');
        fetchCampaigns();
      } else {
        toast.error(data.error || 'Erreur lors de la reprise');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditCampaign = async (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      instanceName: campaign.instanceName,
      name: campaign.name,
      message: campaign.message || '',
      scheduledAt: new Date(campaign.scheduledAt).toISOString().slice(0, 16),
      mediaUrl: campaign.mediaUrl || '',
      mediaType: campaign.mediaType || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCampaign) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/campaigns/${editingCampaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          message: formData.message,
          scheduledAt: new Date(formData.scheduledAt).toISOString(),
          mediaUrl: formData.mediaUrl || undefined,
          mediaType: formData.mediaType || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Campagne modifiée avec succès');
        setEditingCampaign(null);
        setFormData({
          instanceName: '',
          name: '',
          message: '',
          scheduledAt: '',
          mediaUrl: '',
          mediaType: '',
        });
        fetchCampaigns();
      } else {
        toast.error(data.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingCampaign(null);
    setFormData({
      instanceName: '',
      name: '',
      message: '',
      scheduledAt: '',
      mediaUrl: '',
      mediaType: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
      RUNNING: { color: 'bg-blue-100 text-blue-800', icon: Loader2, label: 'En cours' },
      PROCESSING: { color: 'bg-blue-100 text-blue-800', icon: Loader2, label: 'En traitement' },
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Terminée' },
      FAILED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Échouée' },
      PAUSED: { color: 'bg-gray-100 text-gray-800', icon: Pause, label: 'En pause' },
    };

    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Diffusion
        </h1>
        <p className="text-slate-600">
          Campagnes marketing & statuts WhatsApp automatisés
        </p>
      </div>

      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-auto gap-3 bg-transparent p-0">
          <TabsTrigger
            value="messages"
            className="relative flex flex-col items-start gap-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md data-[state=active]:border-indigo-500 data-[state=active]:bg-indigo-50 data-[state=active]:shadow-md h-auto whitespace-normal"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 data-[state=active]:bg-indigo-200">
                <MessageSquare className="h-5 w-5" />
              </div>
              <span className="font-semibold text-slate-900 text-sm">Messages Directs</span>
            </div>
            <p className="text-xs text-slate-500 font-normal leading-snug pl-11">
              Envoyez des campagnes à vos contacts et groupes
            </p>
          </TabsTrigger>

          <TabsTrigger
            value="statuts"
            className="relative flex flex-col items-start gap-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-all hover:border-emerald-300 hover:shadow-md data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-50 data-[state=active]:shadow-md h-auto whitespace-normal"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <Smartphone className="h-5 w-5" />
              </div>
              <span className="font-semibold text-slate-900 text-sm">Statuts Automatiques</span>
              <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 hover:bg-emerald-600">Nouveau ✨</Badge>
            </div>
            <p className="text-xs text-slate-500 font-normal leading-snug pl-11">
              Programmez vos stories WhatsApp sans risque
            </p>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statuts">
          <StatusTab />
        </TabsContent>

        <TabsContent value="messages">
        <div className="space-y-6">

      {/* Avertissement anti-spam */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Important :</strong> Évitez le spam pour ne pas être banni. Utilisez les variations anti-spam et espacez vos envois.
        </p>
      </div>

      {/* Limitations Trial */}
      {subscription?.status === 'TRIAL' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Limitations de la période d'essai</h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• <strong>Diffusion :</strong> Maximum 10 destinataires par campagne</li>
                <li>• <strong>Messages restants :</strong> {50 - subscription.messageCount} sur 50 (bot + diffusion combinés)</li>
                <li>• <strong>Durée :</strong> 3 jours d'essai gratuit</li>
              </ul>
              <p className="text-xs text-blue-700 mt-2">
                💡 Passez à un abonnement payant pour des envois illimités
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de création/édition */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            {editingCampaign ? 'Modifier la campagne' : 'Nouvelle campagne'}
          </h2>
          {editingCampaign && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <XCircle className="w-4 h-4" />
              Annuler
            </button>
          )}
        </div>

        <form onSubmit={editingCampaign ? handleUpdateCampaign : handleSubmit} className="space-y-4">
          {/* Instance */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Instance WhatsApp
            </label>
            {loadingInstances ? (
              <div className="w-full px-4 py-3 md:py-2.5 border border-slate-300 rounded-lg bg-slate-50 flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-base md:text-sm">Chargement des instances...</span>
              </div>
            ) : instances.length === 0 ? (
              <div className="w-full px-4 py-3 border border-amber-300 rounded-lg bg-amber-50 text-amber-800 text-base md:text-sm">
                ⚠️ Aucune instance disponible. <a href="/instances" className="underline font-medium">Créez-en une</a>
              </div>
            ) : (
              <select
                value={formData.instanceName}
                onChange={(e) => {
                  const instanceName = e.target.value;
                  setFormData({ ...formData, instanceName });
                  setSelectedContacts([]);
                  setSelectedGroups([]);
                  fetchContactsAndGroups(instanceName);
                }}
                className="w-full px-4 py-3 md:py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed text-base md:text-sm appearance-none bg-white cursor-pointer touch-manipulation"
                style={{
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
                required
                disabled={!!editingCampaign}
              >
                <option value="">Sélectionnez une instance</option>
                {instances.map((instance) => (
                  <option key={instance.instanceName} value={instance.instanceName}>
                    {instance.instanceName} ({instance.status})
                  </option>
                ))}
              </select>
            )}
            {editingCampaign && (
              <p className="text-xs text-slate-500 mt-1">L'instance ne peut pas être modifiée</p>
            )}
          </div>

          {/* Nom de la campagne */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom de la campagne
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Promo Black Friday 2026"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Upload d'image */}
          <ImageUpload
            token={token || ''}
            currentImageUrl={formData.mediaUrl}
            onImageUploaded={(url) => {
              setFormData({ ...formData, mediaUrl: url, mediaType: 'image' });
            }}
            onImageRemoved={() => {
              setFormData({ ...formData, mediaUrl: '', mediaType: '' });
            }}
          />

          {/* Message avec Variations Anti-Spam */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Contenu du message (Variations Anti-Spam)
              </label>
              <button
                type="button"
                onClick={() => setShowSpintaxHelp(!showSpintaxHelp)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Info className="w-4 h-4" />
                Comment éviter les blocages WhatsApp ?
              </button>
            </div>

            {showSpintaxHelp && (
              <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="font-medium text-blue-900 mb-2">Variez vos messages automatiquement</p>
                <p className="text-blue-800 mb-3">
                  L'envoi du même message à des centaines de contacts peut bloquer votre numéro. Utilisez les accolades <code className="bg-blue-100 px-1 rounded">{'{}'}</code> et la barre verticale <code className="bg-blue-100 px-1 rounded">|</code> pour proposer plusieurs choix de mots. Le bot en choisira un au hasard pour chaque client.
                </p>
                <p className="text-blue-700 font-mono text-xs bg-white p-2 rounded border border-blue-200">
                  {'{Bonjour|Salut|Coucou}'} {'{cher client|l\'ami}'} ! {'{Découvrez|Profitez de}'} notre offre.
                </p>
                <p className="text-blue-600 text-xs mt-2">
                  ✨ Chaque destinataire recevra une variation unique du message
                </p>
              </div>
            )}

            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Saisissez votre message ici... Exemple : {Salut|Bonjour}, voici notre {nouvelle offre|promotion}."
              rows={5}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              required
            />
          </div>

          {/* Sélection des destinataires */}
          {formData.instanceName && !editingCampaign && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Destinataires
              </label>
              
              {loadingContacts ? (
                <div className="border border-slate-300 rounded-lg p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Chargement des contacts...</p>
                </div>
              ) : (
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  {/* Barre de recherche et filtres */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un contact ou groupe..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        showOnlyFavorites 
                          ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-amber-500' : ''}`} />
                      {showOnlyFavorites ? 'Afficher tous' : 'Favoris uniquement'}
                    </button>
                  </div>

                  <div className="p-4 max-h-80 overflow-y-auto">
                  {/* Contacts individuels */}
                  {filteredContacts.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                        <h3 className="font-medium text-slate-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          Contacts ({filteredContacts.length}/{contacts.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            const filteredIds = filteredContacts.map(c => c.id);
                            const allFilteredSelected = filteredIds.every(id => selectedContacts.includes(id));
                            if (allFilteredSelected) {
                              setSelectedContacts(selectedContacts.filter(id => !filteredIds.includes(id)));
                            } else {
                              setSelectedContacts(Array.from(new Set([...selectedContacts, ...filteredIds])));
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {filteredContacts.every(c => selectedContacts.includes(c.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                      </div>
                      
                      <div className="space-y-1">
                        {filteredContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded transition-colors group"
                          >
                            <input
                              type="checkbox"
                              checked={selectedContacts.includes(contact.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedContacts([...selectedContacts, contact.id]);
                                } else {
                                  setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500"
                            />
                            <label className="flex-1 min-w-0 cursor-pointer">
                              <p className="text-sm font-medium text-slate-900 truncate">{contact.pushName || 'Sans nom'}</p>
                              <p className="text-xs text-slate-500 truncate">{contact.id}</p>
                            </label>
                            <button
                              type="button"
                              onClick={() => toggleFavoriteContact(contact.id)}
                              className="p-1 hover:bg-blue-100 rounded transition-colors"
                              title={favoriteContacts.includes(contact.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                            >
                              <Star 
                                className={`w-4 h-4 transition-colors ${
                                  favoriteContacts.includes(contact.id) 
                                    ? 'fill-amber-400 text-amber-400' 
                                    : 'text-slate-300 group-hover:text-slate-400'
                                }`} 
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Groupes */}
                  {filteredGroups.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                        <h3 className="font-medium text-slate-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-green-600" />
                          Groupes ({filteredGroups.length}/{groups.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            const filteredIds = filteredGroups.map(g => g.id);
                            const allFilteredSelected = filteredIds.every(id => selectedGroups.includes(id));
                            if (allFilteredSelected) {
                              setSelectedGroups(selectedGroups.filter(id => !filteredIds.includes(id)));
                            } else {
                              setSelectedGroups(Array.from(new Set([...selectedGroups, ...filteredIds])));
                            }
                          }}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          {filteredGroups.every(g => selectedGroups.includes(g.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                      </div>
                      
                      <div className="space-y-1">
                        {filteredGroups.map((group) => (
                          <div
                            key={group.id}
                            className="flex items-center gap-2 p-2 hover:bg-green-50 rounded transition-colors group"
                          >
                            <input
                              type="checkbox"
                              checked={selectedGroups.includes(group.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedGroups([...selectedGroups, group.id]);
                                } else {
                                  setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                                }
                              }}
                              className="w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-2 focus:ring-green-500"
                            />
                            <label className="flex-1 min-w-0 cursor-pointer">
                              <p className="text-sm font-medium text-slate-900 truncate">{group.subject}</p>
                              <p className="text-xs text-slate-500">{group.size} membres</p>
                            </label>
                            <button
                              type="button"
                              onClick={() => toggleFavoriteGroup(group.id)}
                              className="p-1 hover:bg-green-100 rounded transition-colors"
                              title={favoriteGroups.includes(group.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                            >
                              <Star 
                                className={`w-4 h-4 transition-colors ${
                                  favoriteGroups.includes(group.id) 
                                    ? 'fill-amber-400 text-amber-400' 
                                    : 'text-slate-300 group-hover:text-slate-400'
                                }`} 
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredContacts.length === 0 && filteredGroups.length === 0 && (contacts.length > 0 || groups.length > 0) && (
                    <div className="text-center py-8">
                      <Search className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">Aucun résultat trouvé</p>
                      <p className="text-xs text-slate-400 mt-1">Essayez une autre recherche ou désactivez le filtre favoris</p>
                    </div>
                  )}

                  {contacts.length === 0 && groups.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">Aucun contact ou groupe trouvé</p>
                      <p className="text-xs text-slate-400 mt-1">Assurez-vous que l'instance est connectée</p>
                    </div>
                  )}
                  </div>
                </div>
              )}
              
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="text-slate-600">
                  <span className="font-medium text-blue-600">{selectedContacts.length}</span> contact(s)
                </span>
                <span className="text-slate-600">
                  <span className="font-medium text-green-600">{selectedGroups.length}</span> groupe(s)
                </span>
                <span className="text-slate-600">
                  Total: <span className="font-medium text-slate-900">{selectedContacts.length + selectedGroups.length}</span> destinataire(s)
                </span>
                {subscription?.status === 'TRIAL' && selectedContacts.length + selectedGroups.length > 10 && (
                  <span className="text-red-600 font-semibold">
                    ⚠️ Limite trial dépassée (max 10)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Date et heure */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date et heure de programmation
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Bouton de soumission */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5" />
                Programmer la campagne
              </>
            )}
          </button>
        </form>
      </div>

      {/* Liste des campagnes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Mes campagnes
        </h2>

        {loadingCampaigns ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-slate-500">Chargement des campagnes...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-8">
            <Send className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune campagne créée</p>
            <p className="text-sm text-slate-400">Créez votre première campagne ci-dessus</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-slate-900">{campaign.name}</h3>
                    <p className="text-sm text-slate-500">Instance: {campaign.instanceName}</p>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4" />
                    <span>{campaign.recipientsCount} destinataires</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>{campaign.processedCount} envoyés</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(campaign.scheduledAt).toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>Créée le {new Date(campaign.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                {campaign.status === 'RUNNING' && (
                  <div className="mt-3">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(campaign.processedCount / campaign.recipientsCount) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {Math.round((campaign.processedCount / campaign.recipientsCount) * 100)}% complété
                    </p>
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 flex-wrap">
                  {/* Dupliquer */}
                  <button
                    onClick={() => handleDuplicateCampaign(campaign.id)}
                    disabled={actionLoading === campaign.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Dupliquer la campagne"
                  >
                    {actionLoading === campaign.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    Dupliquer
                  </button>

                  {/* Modifier - uniquement si PENDING ou PAUSED */}
                  {(campaign.status === 'PENDING' || campaign.status === 'PAUSED') && (
                    <button
                      onClick={() => handleEditCampaign(campaign)}
                      disabled={actionLoading === campaign.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Modifier la campagne"
                    >
                      <Edit className="w-4 h-4" />
                      Modifier
                    </button>
                  )}

                  {/* Pause/Resume - uniquement si PENDING ou PAUSED */}
                  {campaign.status === 'PENDING' && (
                    <button
                      onClick={() => handlePauseCampaign(campaign.id)}
                      disabled={actionLoading === campaign.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Mettre en pause"
                    >
                      {actionLoading === campaign.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Pause className="w-4 h-4" />
                      )}
                      Pause
                    </button>
                  )}

                  {campaign.status === 'PAUSED' && (
                    <button
                      onClick={() => handleResumeCampaign(campaign.id)}
                      disabled={actionLoading === campaign.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Reprendre la campagne"
                    >
                      {actionLoading === campaign.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Reprendre
                    </button>
                  )}

                  {/* Supprimer - uniquement si pas en cours */}
                  {campaign.status !== 'PROCESSING' && campaign.status !== 'RUNNING' && (
                    <button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      disabled={actionLoading === campaign.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                      title="Supprimer la campagne"
                    >
                      {actionLoading === campaign.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
