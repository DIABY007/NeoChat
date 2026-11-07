'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Smartphone, Key, CheckCircle2, XCircle, Loader2, Plus, Trash2, Copy, QrCode, Monitor, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import PhoneInput from '@/components/PhoneInput';
import BotConfigPanel from '@/components/BotConfigPanel';
import { analytics } from '@/lib/analytics';

const CODE_VALIDITY_SECONDS = 50;
const PAIRING_STORAGE_KEY = 'neochat_pairing_session';

interface PairingSession {
  instanceName: string;
  phoneNumber: string;
}

interface Instance {
  id: string;
  instanceName: string;
  status: string;
  pairingCode?: string;
  qrCode?: string;
  connectionMethod?: 'pairing' | 'qr';
}

export default function WhatsAppPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [instanceName, setInstanceName] = useState('');
  const [pollingInstance, setPollingInstance] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [createPhoneNumber, setCreatePhoneNumber] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CODE_VALIDITY_SECONDS);
  const [pairingPhone, setPairingPhone] = useState<string>('');
  const [refreshingCode, setRefreshingCode] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRefreshingRef = useRef(false);
  const creationStartTimeRef = useRef<number>(0);
  const connectionStartTimeRef = useRef<number>(0);
  const pairingRefreshCountRef = useRef<number>(0);

  useEffect(() => {
    fetchInstances();
  }, []);

  // Restore pending pairing session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PAIRING_STORAGE_KEY);
      if (stored) {
        const session: PairingSession = JSON.parse(stored);
        setPairingPhone(session.phoneNumber);
        setPhoneNumber(session.phoneNumber);
      }
    } catch { /* ignore */ }
  }, []);

  // Démarrer le polling pour les instances CONNECTING existantes + resume pairing session
  useEffect(() => {
    const connectingInstance = instances.find(inst => inst.status === 'CONNECTING');
    if (connectingInstance && !pollingInstance) {
      console.log('[Frontend] Démarrage auto du polling pour:', connectingInstance.instanceName);
      setPollingInstance(connectingInstance.instanceName);

      // Resume pairing session if phone was stored
      try {
        const stored = localStorage.getItem(PAIRING_STORAGE_KEY);
        if (stored) {
          const session: PairingSession = JSON.parse(stored);
          if (session.instanceName === connectingInstance.instanceName && session.phoneNumber) {
            // Auto-resume: request a fresh code
            if (!connectingInstance.pairingCode && !isRefreshingRef.current) {
              fetchNewPairingCode(connectingInstance.instanceName, session.phoneNumber);
            }
          }
        }
      } catch { /* ignore */ }
    }

    // Clear pairing session storage when connected
    const connectedInstance = instances.find(inst => inst.status === 'CONNECTED');
    if (connectedInstance) {
      localStorage.removeItem(PAIRING_STORAGE_KEY);
      stopCountdown();
    }
  }, [instances]);

  useEffect(() => {
    if (pollingInstance) {
      const interval = setInterval(() => {
        checkInstanceStatus(pollingInstance);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [pollingInstance]);

  // Countdown timer for pairing code validity
  useEffect(() => {
    // Only run countdown when there's an active pairing code displayed
    const connectingWithCode = instances.find(
      inst => inst.status === 'CONNECTING' && inst.pairingCode && (inst.connectionMethod || 'pairing') === 'pairing'
    );
    if (!connectingWithCode || !pairingPhone) {
      return;
    }

    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up — refresh the code
          if (!isRefreshingRef.current) {
            fetchNewPairingCode(connectingWithCode.instanceName, pairingPhone);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => stopCountdown();
  }, [instances, pairingPhone]);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const fetchNewPairingCode = useCallback(async (instName: string, phone: string) => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setRefreshingCode(true);

    try {
      const response = await api.post('/instances/pairing-code', {
        instanceName: instName,
        phoneNumber: phone,
      });

      if (response.data.success) {
        const newCode = response.data.data.code;
        pairingRefreshCountRef.current += 1;
        analytics.trackPairingCodeGenerated(instName, pairingRefreshCountRef.current > 1, pairingRefreshCountRef.current);
        setInstances(prev =>
          prev.map(inst =>
            inst.instanceName === instName
              ? { ...inst, pairingCode: newCode, connectionMethod: 'pairing' }
              : inst
          )
        );
        setTimeLeft(CODE_VALIDITY_SECONDS);
        console.log('[Frontend] Nouveau code de jumelage:', newCode);
      }
    } catch (error: any) {
      console.error('[Frontend] Erreur rafraîchissement code:', error);
      setTimeLeft(CODE_VALIDITY_SECONDS);
    } finally {
      isRefreshingRef.current = false;
      setRefreshingCode(false);
    }
  }, []);

  const fetchInstances = async () => {
    try {
      const response = await api.get('/instances/list');
      if (response.data.success) {
        setInstances(response.data.data.instances || []);
      }
      setLoading(false);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des instances:', error);
      setLoading(false);
    }
  };

  const checkInstanceStatus = async (instanceName: string) => {
    try {
      const response = await api.get(`/instances/status/${instanceName}`);
      
      if (response.data.success) {
        const { status, qrCode } = response.data.data;
        
        console.log('[Frontend] Statut actuel:', status);
        
        setInstances(prev =>
          prev.map(inst =>
            inst.instanceName === instanceName
              ? { ...inst, status, qrCode: qrCode || inst.qrCode }
              : inst
          )
        );

        // Détecter une déconnexion forcée par le provider
        if (status === 'DISCONNECTED') {
          const previousInstance = instances.find(inst => inst.instanceName === instanceName);
          if (previousInstance?.status === 'CONNECTED') {
            analytics.trackInstanceDisconnectedByProvider(instanceName, 'connection_closed');
          }
        }

        // Stopper le polling si connecté
        if (status === 'CONNECTED') {
          console.log('[Frontend] ✅ Instance connectée - Arrêt du polling');
          const previousInstance = instances.find(inst => inst.instanceName === instanceName);
          const wasDisconnected = previousInstance?.status === 'DISCONNECTED';
          const connTime = connectionStartTimeRef.current ? Math.round((Date.now() - connectionStartTimeRef.current) / 1000) : 0;

          if (wasDisconnected) {
            analytics.trackInstanceReconnected(instanceName, true, Math.round(connTime / 60), 'pairing_code');
          }
          analytics.trackInstanceConnectedSuccess(
            instanceName,
            'pairing_code',
            connTime,
            pairingRefreshCountRef.current,
            instances.length <= 1
          );
          setPollingInstance(null);
          stopCountdown();
          localStorage.removeItem(PAIRING_STORAGE_KEY);
          toast.success('Instance connectée avec succès !');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut:', error);
    }
  };

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instanceName.trim()) {
      toast.error('Veuillez entrer un nom d\'instance');
      return;
    }

    if (!createPhoneNumber.trim()) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return;
    }

    setCreating(true);
    creationStartTimeRef.current = Date.now();
    connectionStartTimeRef.current = Date.now();
    pairingRefreshCountRef.current = 0;
    analytics.trackInstanceCreationStarted('pairing_code', instances.length);
    try {
      const response = await api.post('/instances/create', {
        instanceName: instanceName.trim(),
        phoneNumber: createPhoneNumber.trim(),
      });

      if (response.data.success) {
        const newInstance = response.data.data.instance;
        const createTime = Math.round((Date.now() - creationStartTimeRef.current) / 1000);
        analytics.trackInstanceCreatedSuccess(
          newInstance.instanceName,
          'pairing_code',
          createPhoneNumber.slice(0, 3),
          instances.length === 0,
          createTime
        );
        setInstances(prev => [...prev, newInstance]);
        setPollingInstance(newInstance.instanceName);
        setShowCreateForm(false);
        setInstanceName('');
        setCreatePhoneNumber('');
        
        // Afficher le pairing code s'il a été généré automatiquement
        if (newInstance.pairingCode) {
          toast.success(`Instance créée ! Code de jumelage: ${newInstance.pairingCode}`, {
            duration: 15000,
            icon: '🔑',
          });
        } else {
          toast.success('Instance créée ! Le code de connexion va s\'afficher dans quelques secondes.');
        }
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de la création';
      const errTime = Math.round((Date.now() - creationStartTimeRef.current) / 1000);
      analytics.trackInstanceConnectionFailed(instanceName, 'pairing_code', 'api_error', errTime);
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteInstance = async (instanceName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'instance "${instanceName}" ?`)) {
      return;
    }

    try {
      const response = await api.delete(`/instances/${instanceName}`);
      
      if (response.data.success) {
        const deletedInstance = instances.find(inst => inst.instanceName === instanceName);
        analytics.trackInstanceDeleted(instanceName, deletedInstance?.status === 'CONNECTED', 0);
        setInstances(prev => prev.filter(inst => inst.instanceName !== instanceName));
        if (pollingInstance === instanceName) {
          setPollingInstance(null);
        }
        toast.success('Instance supprimée avec succès');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de la suppression';
      toast.error(errorMsg);
    }
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'CONNECTING':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'DISCONNECTED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return 'Connecté';
      case 'CONNECTING':
        return 'En attente de scan...';
      case 'DISCONNECTED':
        return 'Déconnecté';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CONNECTING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DISCONNECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            WhatsApp
          </h1>
          <p className="text-slate-600">
            {instances.length > 0 
              ? 'Votre instance WhatsApp (1 instance maximum par compte)'
              : 'Gérez vos instances WhatsApp'
            }
          </p>
        </div>
        {!showCreateForm && instances.length === 0 && (
          <Button onClick={() => setShowCreateForm(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle instance
          </Button>
        )}
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Créer une instance WhatsApp</CardTitle>
            <CardDescription>
              Donnez un nom à votre instance pour la connecter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateInstance} className="space-y-4">
              <div>
                <label htmlFor="instanceName" className="block text-sm font-medium text-slate-700 mb-2">
                  Nom de l'instance
                </label>
                <Input
                  id="instanceName"
                  type="text"
                  placeholder="MonEntreprise"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div>
                <label htmlFor="createPhoneNumber" className="block text-sm font-medium text-slate-700 mb-2">
                  Numéro de téléphone WhatsApp
                </label>
                <PhoneInput
                  value={createPhoneNumber}
                  onChange={setCreatePhoneNumber}
                  disabled={creating}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Le numéro avec lequel vous allez connecter WhatsApp (avec code pays)
                </p>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer l\'instance'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setInstanceName('');
                    setCreatePhoneNumber('');
                  }}
                  disabled={creating}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {instances.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Smartphone className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">
              Aucune instance WhatsApp créée
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer ma première instance
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {instances.map((instance) => (
            <Card key={instance.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{instance.instanceName}</CardTitle>
                      <CardDescription>Instance WhatsApp</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(instance.status)}
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                          instance.status
                        )}`}
                      >
                        {getStatusLabel(instance.status)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteInstance(instance.instanceName)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {instance.status === 'CONNECTING' && (
                <CardContent>
                  {/* Toggle entre Pairing Code et QR Code */}
                  <div className="mb-6">
                    <div className="flex items-center justify-center gap-2 bg-slate-100 p-1 rounded-lg w-fit mx-auto">
                      <button
                        onClick={() => {
                          setInstances(prev =>
                            prev.map(inst =>
                              inst.id === instance.id
                                ? { ...inst, connectionMethod: 'pairing', qrCode: undefined }
                                : inst
                            )
                          );
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          (instance.connectionMethod || 'pairing') === 'pairing'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Smartphone className="w-4 h-4 inline mr-2" />
                        Code de connexion (Mobile)
                      </button>
                      <button
                        onClick={() => {
                          setInstances(prev =>
                            prev.map(inst =>
                              inst.id === instance.id
                                ? { ...inst, connectionMethod: 'qr', pairingCode: undefined }
                                : inst
                            )
                          );
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          instance.connectionMethod === 'qr'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Monitor className="w-4 h-4 inline mr-2" />
                        QR Code (PC)
                      </button>
                    </div>
                  </div>

                  {/* Pairing Code Method */}
                  {(instance.connectionMethod || 'pairing') === 'pairing' && (
                    <div className="bg-slate-50 rounded-lg p-4 sm:p-6">
                      {!instance.pairingCode ? (
                        <div className="max-w-md mx-auto">
                          <div className="text-center mb-6">
                            <Smartphone className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                              Connexion par numéro
                            </h3>
                            <p className="text-sm text-slate-600">
                              Entrez votre numéro WhatsApp pour recevoir un code de connexion
                            </p>
                          </div>
                        <div className="space-y-4">
                          <PhoneInput
                            value={phoneNumber}
                            onChange={setPhoneNumber}
                            disabled={generatingCode}
                          />
                          <Button
                            onClick={async () => {
                              if (!phoneNumber || phoneNumber.length < 10) {
                                toast.error('Veuillez entrer un numéro de téléphone valide');
                                return;
                              }
                              setGeneratingCode(true);
                              toast.loading('Préparation de la connexion...', { id: 'pairing-code' });
                              try {
                                const response = await api.post('/instances/pairing-code', {
                                  instanceName: instance.instanceName,
                                  phoneNumber: phoneNumber,
                                });
                                if (response.data.success) {
                                  setInstances(prev =>
                                    prev.map(inst =>
                                      inst.id === instance.id
                                        ? { ...inst, pairingCode: response.data.data.code, connectionMethod: 'pairing' }
                                        : inst
                                    )
                                  );
                                  setPairingPhone(phoneNumber);
                                  setTimeLeft(CODE_VALIDITY_SECONDS);
                                  localStorage.setItem(PAIRING_STORAGE_KEY, JSON.stringify({
                                    instanceName: instance.instanceName,
                                    phoneNumber: phoneNumber,
                                  }));
                                  toast.success('Code de connexion généré !', { id: 'pairing-code' });
                                }
                              } catch (error: any) {
                                const errorMsg = error.response?.data?.error || 'Erreur lors de la génération du code';
                                
                                if (errorMsg.includes('mode QR Code') || errorMsg.includes('créée correctement')) {
                                  toast.error(
                                    'Cette instance ne supporte pas le code de jumelage. Veuillez la supprimer et en créer une nouvelle.',
                                    { id: 'pairing-code', duration: 6000 }
                                  );
                                } else {
                                  toast.error(errorMsg, { id: 'pairing-code' });
                                }
                              } finally {
                                setGeneratingCode(false);
                              }
                            }}
                            disabled={generatingCode}
                            className="w-full"
                          >
                            {generatingCode ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Préparation...
                              </>
                            ) : (
                              <>
                                <Key className="w-4 h-4 mr-2" />
                                Générer le code de connexion
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-2xl mx-auto">
                        <div className="text-center mb-4">
                          <p className="text-sm text-slate-600 mb-4">
                            Votre code de connexion WhatsApp
                          </p>
                          <div className="relative bg-white rounded-xl p-4 sm:p-8 shadow-lg inline-block">
                            <div className={`font-mono text-4xl sm:text-5xl md:text-6xl font-bold tracking-[0.3em] sm:tracking-widest text-slate-900 transition-opacity ${refreshingCode ? 'opacity-40' : 'opacity-100'}`}>
                              {instance.pairingCode}
                            </div>
                            {refreshingCode && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                              </div>
                            )}
                          </div>

                          {/* Countdown Progress Bar */}
                          <div className="mt-5 max-w-xs mx-auto space-y-2">
                            <Progress
                              value={(timeLeft / CODE_VALIDITY_SECONDS) * 100}
                              className={`h-2 ${timeLeft <= 10 ? '[&>div]:bg-red-500' : timeLeft <= 20 ? '[&>div]:bg-orange-500' : '[&>div]:bg-blue-600'}`}
                            />
                            <p className={`text-xs font-medium ${
                              timeLeft <= 10 ? 'text-red-600' : timeLeft <= 20 ? 'text-orange-600' : 'text-slate-500'
                            }`}>
                              {timeLeft > 0
                                ? `Ce code expire dans ${timeLeft}s — un nouveau code sera généré automatiquement.`
                                : 'Génération d\'un nouveau code...'
                              }
                            </p>
                          </div>

                          <div className="flex items-center justify-center gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(instance.pairingCode || '');
                                analytics.trackPairingCodeCopied(instance.instanceName, timeLeft);
                                toast.success('Code copié !');
                              }}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copier
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={refreshingCode}
                              onClick={() => fetchNewPairingCode(instance.instanceName, pairingPhone)}
                            >
                              <RefreshCw className={`w-4 h-4 mr-2 ${refreshingCode ? 'animate-spin' : ''}`} />
                              Rafraîchir
                            </Button>
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mt-4">
                          <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            <Smartphone className="w-5 h-5" />
                            Instructions de connexion
                          </h4>
                          <ol className="space-y-3 text-sm text-blue-800">
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                1
                              </span>
                              <span>Ouvrez <strong>WhatsApp</strong> sur votre téléphone</span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                2
                              </span>
                              <span>Allez dans <strong>Réglages → Appareils connectés</strong></span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                3
                              </span>
                              <span>Appuyez sur <strong>"Connecter un appareil"</strong> puis <strong>"Connecter avec le numéro de téléphone à la place"</strong></span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                4
                              </span>
                              <span>Saisissez ce code à 8 caractères : <strong className="font-mono text-sm sm:text-base md:text-lg break-all">{instance.pairingCode}</strong></span>
                            </li>
                          </ol>
                        </div>

                        <p className="text-xs text-slate-500 text-center mt-4">
                          Le statut se mettra à jour automatiquement une fois la connexion établie
                        </p>
                      </div>
                    )}
                    </div>
                  )}

                  {/* QR Code Method */}
                  {instance.connectionMethod === 'qr' && (
                    <div className="bg-slate-50 rounded-lg p-6">
                      {instance.qrCode ? (
                        <div className="text-center">
                          <Monitor className="w-12 h-12 text-green-600 mx-auto mb-3" />
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            Scanner le QR Code
                          </h3>
                          <p className="text-sm text-slate-600 mb-4">
                            Scannez ce code avec WhatsApp sur votre téléphone
                          </p>
                          <div className="inline-block bg-white p-4 rounded-lg shadow-sm">
                            <img
                              src={instance.qrCode}
                              alt="QR Code WhatsApp"
                              className="w-64 h-64 mx-auto"
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-4">
                            Le QR code se rafraîchit automatiquement toutes les 3 secondes
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-3 animate-spin" />
                          <p className="text-sm text-slate-600">
                            Génération du QR code en cours...
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
              {instance.status === 'CONNECTED' && (
                <CardContent>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-green-800">
                      ✅ Instance connectée et prête à recevoir des messages !
                    </p>
                  </div>
                  <BotConfigPanel 
                    instanceId={instance.id} 
                    instanceName={instance.instanceName}
                  />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
