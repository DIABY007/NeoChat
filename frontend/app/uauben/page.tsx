'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Clock, Users, Zap, TrendingUp, BookOpen, CheckCircle, GraduationCap, Building2, ArrowRight, Phone, Bot, Calendar, BarChart3, Filter, ChevronDown, Sun, Moon, Sunrise, PieChart, Tag } from 'lucide-react';

export default function UAUBENDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [themes, setThemes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterDirection, setFilterDirection] = useState('');

  const INSTANCE_NAME = 'UAUBEN_SCHOOLL';

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api/backend';
      const [statsRes, activityRes, themesRes] = await Promise.all([
        fetch(`${apiBase}/instances/stats/${INSTANCE_NAME}`, { cache: 'no-store' }),
        fetch(`${apiBase}/instances/activity/${INSTANCE_NAME}${filterDate ? `?date=${filterDate}` : ''}${filterDirection ? `${filterDate ? '&' : '?'}direction=${filterDirection}` : ''}`, { cache: 'no-store' }),
        fetch(`${apiBase}/instances/themes/${INSTANCE_NAME}`, { cache: 'no-store' }),
      ]);
      const statsData = await statsRes.json();
      const activityData = await activityRes.json();
      const themesData = await themesRes.json();
      if (statsData.success) setStats(statsData.data);
      else setError('Impossible de charger les statistiques');
      if (activityData.success) setActivity(activityData.data);
      if (themesData.success) setThemes(themesData.data);
    } catch (err: any) {
      console.error('[UAUBEN] Erreur:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchAllData();
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('fr-FR');
  };

  const getPeakLabel = (hour: number) => {
    if (hour < 6) return 'Nuit';
    if (hour < 12) return 'Matin';
    if (hour < 18) return 'Après-midi';
    return 'Soir';
  };

  const getPeakIcon = (hour: number) => {
    if (hour < 6) return Moon;
    if (hour < 12) return Sunrise;
    if (hour < 18) return Sun;
    return Moon;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-900 font-medium">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-10 h-10 text-red-700" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Dashboard indisponible</h2>
          <p className="text-slate-600 mb-6">
            {error || "Les statistiques ne sont pas disponibles pour le moment."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-900 text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const { instance, stats: data, config } = stats;
  const totalHours = data.totalHoursSaved;
  const hoursValue = Math.floor(totalHours);
  const minutesValue = Math.round((totalHours - hoursValue) * 60);

  const maxActivity = activity?.hourlyActivity
    ? Math.max(...activity.hourlyActivity.map((h: any) => h.total), 1)
    : 1;

  // Stats pour les cartes
  const cards = [
    {
      title: 'Messages Envoyés',
      value: formatNumber(data.totalMessages),
      icon: MessageSquare,
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      description: 'Questions traitées automatiquement par l\'IA',
    },
    {
      title: 'Utilisateurs Uniques',
      value: formatNumber(data.uniqueUsers),
      icon: Users,
      color: 'from-red-600 to-red-700',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      description: 'Numéros distincts ayant interagi avec l\'agent',
    },
    {
      title: 'Conversations Entamées',
      value: formatNumber(data.estimatedConversations),
      icon: MessageSquare,
      color: 'from-blue-700 to-blue-800',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      description: 'Échanges avec les étudiants et enseignants',
    },
    {
      title: 'Temps de Travail Économisé',
      value: `${hoursValue}h${minutesValue > 0 ? ` ${minutesValue}min` : ''}`,
      icon: Clock,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      description: 'Basé sur 3 minutes économisées par question',
    },
    {
      title: 'Jours ouvrés Économisés',
      value: `${formatNumber(Math.floor(data.totalDaysSaved))} jours`,
      icon: Calendar,
      color: 'from-blue-800 to-blue-900',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-900',
      description: 'Équivalent à des journées complètes de travail',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-red-800 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-700/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-600/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <GraduationCap className="w-5 h-5" />
            <span className="text-sm font-medium">Université / Institution</span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
              <img src="/logo-uauben.png" alt="U-AUBEN Logo" className="w-20 h-20 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-bold">
                Tableau de Bord
              </h1>
              <p className="text-blue-100 text-lg mt-1">
                Instance {instance.instanceName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <div className="inline-flex items-center gap-2 bg-blue-600/30 backdrop-blur-sm rounded-full px-4 py-2">
              <div className={`w-2.5 h-2.5 rounded-full ${instance.isBotActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm">Bot {instance.isBotActive ? 'Actif' : 'Inactif'}</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm">{data.knowledgeDocsCount} document{data.knowledgeDocsCount > 1 ? 's' : ''} en base</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">{data.autoReplyRate}% de réponses automatiques</span>
            </div>
          </div>
        </div>

        <div className="relative h-8 md:h-12">
          <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1440 48" preserveAspectRatio="none">
            <path fill="white" d="M0,48 C360,0 1080,0 1440,48 L1440,48 L0,48 Z" />
          </svg>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="max-w-6xl mx-auto px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {cards.map((card, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              <div className={`h-2 bg-gradient-to-r ${card.color}`}></div>
              <div className="p-5 md:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${card.bgColor} rounded-xl flex items-center justify-center`}>
                    <card.icon className={`w-6 h-6 ${card.textColor}`} />
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-400">STATISTIQUE</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-1">{card.title}</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                  {card.value}
                </p>
                <p className="text-xs text-slate-400">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Chart Section */}
      <div className="max-w-6xl mx-auto px-4 pt-12">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header with filters */}
          <div className="p-6 md:p-8 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Activité par Plage Horaire</h3>
                  <p className="text-sm text-slate-500">Distribution des messages sur 24h</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full sm:w-44 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterDirection}
                  onChange={(e) => setFilterDirection(e.target.value)}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                >
                  <option value="">Tous les messages</option>
                  <option value="INCOMING">Messages reçus</option>
                  <option value="OUTGOING">Réponses envoyées</option>
                </select>
                <button
                  onClick={handleFilter}
                  className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filtrer
                </button>
              </div>
            </div>
          </div>

          {/* Chart body */}
          <div className="p-6 md:p-8">
            {activity?.hourlyActivity ? (
              <>
                {/* Summary badges */}
                {activity.summary && (
                  <div className="flex flex-wrap gap-3 mb-6">
                    <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-sm">
                      <MessageSquare className="w-4 h-4" />
                      {activity.summary.totalMessages} messages
                    </div>
                    <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 rounded-full px-4 py-1.5 text-sm">
                      <TrendingUp className="w-4 h-4" />
                      {activity.summary.totalIncoming} reçus
                    </div>
                    <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-sm">
                      <Zap className="w-4 h-4" />
                      {activity.summary.totalOutgoing} envoyés
                    </div>
                  </div>
                )}

                {/* Peak hours */}
                {activity.summary?.peakHours?.length > 0 && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-blue-50 rounded-xl border border-red-200">
                    <p className="text-sm font-semibold text-red-800 mb-2">⏰ Heures de pointe</p>
                    <div className="flex flex-wrap gap-2">
                      {activity.summary.peakHours.map((h: any) => {
                        const PeakIcon = getPeakIcon(h.hour);
                        return (
                          <span key={h.hour} className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1 text-sm text-red-700 shadow-sm">
                            <PeakIcon className="w-3.5 h-3.5" />
                            {h.label} ({h.total} messages)
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bar Chart */}
                <div className="space-y-2">
                  {activity.hourlyActivity.map((h: any) => {
                    const barHeight = (h.total / maxActivity) * 100;
                    const isPeak = activity.summary?.peakHours?.some((p: any) => p.hour === h.hour);
                    return (
                      <div key={h.hour} className="flex items-center gap-3 group">
                        <span className="w-12 text-xs font-mono text-slate-400 text-right flex-shrink-0">
                          {h.label}
                        </span>
                        <div className="flex-1 relative h-7 bg-slate-50 rounded-lg overflow-hidden">
                          {/* Barre INCOMING */}
                          <div
                            className={`absolute inset-y-0 left-0 rounded-lg transition-all duration-500 ${
                              isPeak ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-blue-400 to-blue-500'
                            }`}
                            style={{ width: `${(h.total / maxActivity) * 100}%`, opacity: 0.8 }}
                          ></div>
                          {/* Barre OUTGOING (superposée, plus claire) */}
                          {h.outgoing > 0 && (
                            <div
                              className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500 bg-gradient-to-r from-red-400 to-red-500"
                              style={{ width: `${(h.outgoing / maxActivity) * 100}%`, opacity: 0.7 }}
                            ></div>
                          )}
                        </div>
                        <div className="w-16 text-right flex-shrink-0">
                          <span className={`text-xs font-semibold ${isPeak ? 'text-blue-700' : 'text-slate-500'}`}>
                            {h.total}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500"></div>
                    <span className="text-xs text-slate-500">Messages reçus</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-400"></div>
                    <span className="text-xs text-slate-500">Réponses envoyées</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-700"></div>
                    <span className="text-xs text-slate-500">Heure de pointe</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Aucune activité enregistrée</p>
                <p className="text-slate-400 text-sm mt-1">Les données apparaîtront quand le bot commencera à traiter des messages</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Themes Section */}
      {themes && themes.themes && themes.themes.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-12">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Thématiques des Questions</h3>
                  <p className="text-sm text-slate-500">
                    Analyse des {themes.messageCount} messages du {themes.date ? new Date(themes.date).toLocaleDateString('fr-FR') : '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {themes.themes.map((t: any, i: number) => {
                  const colors = [
                    'from-blue-500 to-blue-600',
                    'from-red-500 to-red-600',
                    'from-blue-600 to-blue-700',
                    'from-red-600 to-red-700',
                    'from-blue-700 to-blue-800',
                    'from-red-700 to-red-800',
                  ];
                  const bgColors = [
                    'bg-blue-50 text-blue-700',
                    'bg-red-50 text-red-700',
                    'bg-blue-50 text-blue-700',
                    'bg-red-50 text-red-700',
                    'bg-blue-50 text-blue-700',
                    'bg-red-50 text-red-700',
                  ];
                  const colorIdx = i % colors.length;
                  return (
                    <div key={i} className="bg-slate-50 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-slate-500" />
                          <span className="font-semibold text-slate-900">{t.theme}</span>
                        </div>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${bgColors[colorIdx]}`}>
                          {t.pourcentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                          className={`bg-gradient-to-r ${colors[colorIdx]} h-3 rounded-full transition-all duration-1000`}
                          style={{ width: `${t.pourcentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Stats Section */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Time Saved Detail Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Détail du Temps Économisé</h3>
                <p className="text-sm text-slate-500">Calcul basé sur vos statistiques réelles</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-slate-700">Questions traitées</span>
                </div>
                <span className="font-bold text-slate-900">{formatNumber(data.totalMessages)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-slate-700">Minutes par question au guichet</span>
                </div>
                <span className="font-bold text-slate-900">{config.minutesPerQuestion} min</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-slate-700">Total minutes économisées</span>
                </div>
                <span className="font-bold text-slate-900">{formatNumber(data.totalMinutesSaved)} min</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-slate-700">Total heures économisées</span>
                </div>
                <span className="font-bold text-slate-900">{formatNumber(Math.floor(data.totalHoursSaved))} h</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-slate-700">Jours ouvrés économisés</span>
                </div>
                <span className="font-bold text-slate-900">{formatNumber(Math.floor(data.totalDaysSaved))} jours</span>
              </div>
            </div>

            <div className="mt-6 bg-gradient-to-r from-red-600 to-blue-700 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">Impact Global</span>
              </div>
              <p className="text-2xl font-bold mb-1">
                {formatNumber(data.totalMessages)} questions × {config.minutesPerQuestion} min = <span className="text-3xl">{Math.floor(data.totalHoursSaved)}h</span>
              </p>
              <p className="text-red-100 text-sm">
                Temps de travail économisé grâce à l'automatisation IA
              </p>
            </div>
          </div>

          {/* Performance Stats Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Performance de l'IA</h3>
                <p className="text-sm text-slate-500">Efficacité du traitement automatique</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Taux de réponses automatiques</span>
                  <span className="text-sm font-bold text-blue-700">{data.autoReplyRate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${data.autoReplyRate}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Taux de couverture</span>
                  <span className="text-sm font-bold text-red-700">
                    {data.totalMessages > 0
                      ? `${Math.round(((data.totalMessages - (data.noAnswerCount || 0)) / data.totalMessages) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-1000"
                    style={{
                      width: `${data.totalMessages > 0
                        ? Math.round(((data.totalMessages - (data.noAnswerCount || 0)) / data.totalMessages) * 100)
                        : 0}%`
                    }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{data.knowledgeDocsCount}</p>
                  <p className="text-xs text-slate-500">Documents en base</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{data.uniqueUsers || 0}</p>
                  <p className="text-xs text-slate-500">Utilisateurs uniques</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{data.estimatedConversations}</p>
                  <p className="text-xs text-slate-500">Conversations</p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Informations de l'instance</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Nom</span>
                  <span className="font-medium text-slate-700">{instance.instanceName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Statut</span>
                  <span className={`font-medium ${instance.status === 'CONNECTED' ? 'text-green-600' : 'text-slate-500'}`}>
                    {instance.status === 'CONNECTED' ? 'Connecté' : instance.status === 'DISCONNECTED' ? 'Déconnecté' : 'En cours'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Bot</span>
                  <span className={`font-medium ${instance.isBotActive ? 'text-green-600' : 'text-slate-500'}`}>
                    {instance.isBotActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Créée le</span>
                  <span className="font-medium text-slate-700">
                    {new Date(instance.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-600">
              <Bot className="w-5 h-5 text-blue-700" />
              <span className="font-semibold">NeoChat</span>
              <span className="text-slate-300">|</span>
              <span className="text-sm">Automatisation IA pour votre institution</span>
            </div>
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} NeoChat. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}