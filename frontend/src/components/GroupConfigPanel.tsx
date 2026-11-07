'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Search, 
  Info, 
  Loader2, 
  Save, 
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface WhatsAppGroup {
  id: string;
  name: string;
  isActive: boolean;
}

interface GroupConfigPanelProps {
  instanceId: string;
  instanceName: string;
}

export default function GroupConfigPanel({ instanceId, instanceName }: GroupConfigPanelProps) {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [triggerWord, setTriggerWord] = useState('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  useEffect(() => {
    if (instanceId) {
      fetchGroups();
      fetchSettings();
    }
  }, [instanceId]);

  const fetchSettings = async () => {
    try {
      const response = await api.get(`/bot-config/${instanceId}/settings`);
      if (response.data.success) {
        setTriggerWord(response.data.data.triggerWord || '');
      }
    } catch (error) {
      console.error('Erreur chargement settings:', error);
    }
  };

  const handleUpdateTriggerWord = async () => {
    setIsUpdatingSettings(true);
    try {
      await api.put(`/bot-config/${instanceId}/settings`, {
        triggerWord: triggerWord.trim(),
      });
      toast.success('Mot déclencheur mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/groups/${instanceId}`);
      if (response.data.success) {
        setGroups(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération des groupes:', error);
      toast.error('Impossible de charger les groupes WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGroup = async (groupId: string, currentStatus: boolean, groupName: string) => {
    setSaving(groupId);
    try {
      const response = await api.post('/groups/toggle', {
        instanceId,
        whatsappGroupId: groupId,
        groupName,
        isActive: !currentStatus,
      });

      if (response.data.success) {
        setGroups(prev => 
          prev.map(g => g.id === groupId ? { ...g, isActive: !currentStatus } : g)
        );
        toast.success(`${groupName} ${!currentStatus ? 'activé' : 'désactivé'}`);
      }
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour du groupe');
    } finally {
      setSaving(null);
    }
  };

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(search.toLowerCase()) ||
    group.id.includes(search)
  );

  return (
    <Card className="border-2 border-slate-200">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Réponses de Groupe WhatsApp</CardTitle>
            <CardDescription>
              Gérez les interactions de l'IA dans vos groupes
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mot déclencheur */}
        <div className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <Label className="font-bold text-slate-700">Mot déclencheur (@)</Label>
          </div>
          <p className="text-xs text-slate-500">
            Le bot répondra systématiquement s'il est mentionné avec ce mot (ex: @Oasis).
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
              <Input
                placeholder="Ex: Oasis"
                value={triggerWord}
                onChange={(e) => setTriggerWord(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                className="pl-8 h-11"
              />
            </div>
            <Button 
              onClick={handleUpdateTriggerWord} 
              disabled={isUpdatingSettings}
              className="bg-indigo-600 hover:bg-indigo-700 h-11"
            >
              {isUpdatingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher un groupe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 pl-10"
          />
        </div>

        {/* Liste des groupes */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-500">Récupération des groupes...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">Aucun groupe trouvé</p>
            <p className="text-sm text-slate-500">
              Votre instance ne semble faire partie d'aucun groupe
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {filteredGroups.map((group) => (
              <div 
                key={group.id}
                className={`
                  flex items-center justify-between p-4 rounded-xl border-2 transition-all
                  ${group.isActive 
                    ? 'border-indigo-200 bg-indigo-50/50' 
                    : 'border-slate-100 bg-white hover:border-slate-200'
                  }
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${group.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}
                  `}>
                    {group.isActive ? <ShieldCheck className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{group.name}</p>
                    <p className="text-xs text-slate-500 truncate">{group.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {saving === group.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  ) : (
                    <Switch
                      checked={group.isActive}
                      onCheckedChange={() => handleToggleGroup(group.id, group.isActive, group.name)}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  )}
                </div>
              </div>
            ))}
            {filteredGroups.length === 0 && search && (
              <div className="text-center py-8 text-slate-500 italic">
                Aucun groupe ne correspond à votre recherche
              </div>
            )}
          </div>
        )}

        {/* Note sur les déclencheurs */}
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-700">Règles de déclenchement</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Le bot répondra s'il est mentionné (@{triggerWord || instanceName}) OU s'il détecte une question pertinente (confiance &gt; 25%) dans votre base de connaissances.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
