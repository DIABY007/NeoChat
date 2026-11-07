'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Users, Loader2, ArrowLeft, Smartphone, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import GroupConfigPanel from '@/components/GroupConfigPanel';

export default function CommunitiesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstances = async () => {
      try {
        const response = await api.get('/instances/list');
        const list = response.data.data?.instances || response.data.instances || [];
        setInstances(list);
      } catch (error) {
        console.error('[Communities] Erreur chargement instances:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchInstances();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const connectedInstances = instances.filter(inst => inst.status === 'CONNECTED');

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Communautés</h1>
          <p className="text-slate-600">Activez l'IA dans vos groupes WhatsApp</p>
        </div>
      </div>

      {/* Consignes d'utilisation */}
      <Card className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-0 shadow-lg">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Comment ça marche ?
          </h3>
          <div className="space-y-3 text-indigo-50 text-sm">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-bold">1</div>
              <p>Configurez un <strong>Mot déclencheur</strong> pour votre instance (ex: @Oasis).</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-bold">2</div>
              <p>Activez les <strong>groupes spécifiques</strong> où vous voulez que le bot intervienne.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-bold">3</div>
              <p>Le bot répondra <strong>automatiquement</strong> s'il est appelé par son mot déclencheur OU s'il détecte une question pertinente dans sa base de connaissances.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {instances.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="p-12 text-center">
            <Smartphone className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-900 font-bold mb-2">Aucune instance WhatsApp</p>
            <p className="text-slate-600 mb-6">Vous devez connecter une instance WhatsApp pour gérer vos groupes.</p>
            <Button onClick={() => router.push('/whatsapp')}>
              Connecter WhatsApp
            </Button>
          </CardContent>
        </Card>
      ) : connectedInstances.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50">
          <CardContent className="p-12 text-center">
            <Smartphone className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-900 font-bold mb-2">Instance non connectée</p>
            <p className="text-slate-600 mb-6">Votre instance WhatsApp doit être connectée pour récupérer la liste des groupes.</p>
            <Button onClick={() => router.push('/whatsapp')}>
              Aller à la page WhatsApp
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {connectedInstances.map((instance) => (
            <div key={instance.id} className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <h2 className="font-semibold text-slate-700">Instance : {instance.instanceName}</h2>
              </div>
              <GroupConfigPanel 
                instanceId={instance.id}
                instanceName={instance.instanceName}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
