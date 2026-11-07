'use client';

import { useState } from 'react';
import Link from "next/link";
import Image from "next/image";
import VideoModal from "@/components/VideoModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Rocket, Play, X, Check, Bot, Megaphone, TrendingUp, Smartphone, BookOpen, Send, Shield, Zap, Crown, Star } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SoftwareApplicationSchema, OrganizationSchema } from "@/components/StructuredData";

export default function Home() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <>
      <SoftwareApplicationSchema />
      <OrganizationSchema />
      <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Image 
                src="/logo-neochat.svg" 
                alt="Logo NeoChat - Plateforme d'automatisation WhatsApp" 
                width={32} 
                height={32}
                className="w-8 h-8"
              />
              <span className="text-xl font-bold text-slate-900">NeoChat</span>
            </div>
            <Link href="/register">
              <Button variant="outline" className="font-semibold">
                Se connecter
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge Nouveau */}
            <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <Badge className="bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 border-orange-200 px-4 py-2 text-sm font-semibold hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4 mr-2 inline animate-pulse" />
                Nouveau : L'IA au service de votre business
              </Badge>
            </div>

            {/* Titre Principal H1 */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
              Transformez WhatsApp en{" "}
              <span className="bg-gradient-to-r from-orange-500 via-amber-600 to-orange-600 bg-clip-text text-transparent animate-pulse">
                Machine de Vente
              </span>{" "}
              Automatique 24/7
            </h1>

            {/* Sous-titre */}
            <p className="text-lg sm:text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              Automatisez tout votre WhatsApp : statuts programmés, messages marketing anti-spam 
              et bot IA qui vend et répond à vos clients sans interruption.
            </p>

            {/* Sous-sous-titre (Trust signal) */}
            <p className="text-sm sm:text-base text-slate-500 mb-12 animate-in fade-in duration-1000 delay-300">
              ✅ Essai gratuit 3 jours • Sans carte bancaire • Annulation en 1 clic
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-400">
              <Link href="/register">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
                >
                  <Rocket className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                  Démarrer Gratuitement
                </Button>
              </Link>
              
              <Button 
                size="lg"
                variant="outline"
                className="border-2 border-slate-300 text-slate-700 px-8 py-6 text-lg font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all duration-300 group"
                onClick={() => setIsVideoOpen(true)}
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Voir la Démo
              </Button>
            </div>

            {/* Social Proof Mini-stats */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-sm text-slate-600 animate-in fade-in duration-1000 delay-500">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <span>+500 entrepreneurs nous font confiance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <span>50 000+ messages automatisés ce mois</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌍</span>
                <span>Fait, pour l'Afrique</span>
              </div>
            </div>
          </div>

          {/* Hero Mobile Screenshots */}
          <div className="mt-20 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-600">
            <div className="relative flex items-center justify-center gap-4 sm:gap-6 md:gap-8 px-4">
              
              {/* Screen Left - Ambassadeur */}
              <div className="relative w-[28%] sm:w-[26%] -rotate-6 translate-y-4 hover:rotate-0 hover:translate-y-0 hover:scale-105 transition-all duration-500 ease-out">
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/50 bg-white">
                  <Image
                    src="/screen-ambassadeur.svg"
                    alt="Écran NeoChat - Programme Ambassadeur pour parrainer et gagner"
                    width={390}
                    height={844}
                    className="w-full h-auto"
                  />
                </div>
              </div>

              {/* Screen Center - Dashboard (larger, front) */}
              <div className="relative w-[36%] sm:w-[34%] z-10 hover:scale-105 transition-all duration-500 ease-out">
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-orange-500/20 ring-1 ring-orange-200/50 bg-white">
                  {/* Subtle glow behind center screen */}
                  <div className="absolute -inset-1 bg-gradient-to-b from-orange-400/20 via-amber-400/10 to-transparent rounded-3xl blur-xl -z-10"></div>
                  <Image
                    src="/screen-dashboard.svg"
                    alt="Dashboard NeoChat - Statistiques et gestion WhatsApp automatisée"
                    width={390}
                    height={844}
                    priority
                    className="w-full h-auto"
                  />
                </div>
              </div>

              {/* Screen Right - Programmer message */}
              <div className="relative w-[28%] sm:w-[26%] rotate-6 translate-y-4 hover:rotate-0 hover:translate-y-0 hover:scale-105 transition-all duration-500 ease-out">
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/50 bg-white">
                  <Image
                    src="/screen-programmer.svg"
                    alt="Écran NeoChat - Programmer des messages WhatsApp automatiques"
                    width={390}
                    height={844}
                    className="w-full h-auto"
                  />
                </div>
              </div>

            </div>

            {/* Labels under screenshots */}
            <div className="flex items-center justify-center gap-6 sm:gap-12 mt-8 text-xs sm:text-sm text-slate-500 font-medium">
              <span>Ambassadeur</span>
              <span className="text-orange-600 font-semibold">Dashboard</span>
              <span>Campagnes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section Problème / Solution */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Vous Perdez des Clients à Cause de Ces Problèmes ?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Vos clients détestent attendre. WhatsApp déteste le spam. NeoChat résout les deux.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Problèmes - Colonne Gauche */}
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-6 rounded-xl bg-red-50 border border-red-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Réponses trop lentes</h3>
                  <p className="text-slate-600 text-sm">Vous répondez trop lentement aux clients et perdez des ventes</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-red-50 border border-red-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Ventes perdues 24/7</h3>
                  <p className="text-slate-600 text-sm">Vous perdez des ventes la nuit et le week-end</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-red-50 border border-red-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Bannissement pour spam</h3>
                  <p className="text-slate-600 text-sm">Vos campagnes WhatsApp vous font bannir pour spam</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-red-50 border border-red-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Réponses répétitives</h3>
                  <p className="text-slate-600 text-sm">Vous répétez les mêmes réponses 100 fois par jour</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-red-50 border border-red-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Surcharge de conversations</h3>
                  <p className="text-slate-600 text-sm">Impossible de gérer 50+ conversations en même temps</p>
                </div>
              </div>
            </div>

            {/* Solutions - Colonne Droite */}
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Réponses instantanées</h3>
                  <p className="text-slate-600 text-sm">Bot IA répond en moins de 2 secondes</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Ventes automatiques 24/7</h3>
                  <p className="text-slate-600 text-sm">Ventes automatiques 24/7, même pendant votre sommeil</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Protection anti-spam</h3>
                  <p className="text-slate-600 text-sm">Système anti-spam avec variations de messages</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">IA formée sur vos produits</h3>
                  <p className="text-slate-600 text-sm">IA formée sur vos produits/services (PDF/Texte)</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Diffusion de masse</h3>
                  <p className="text-slate-600 text-sm">Diffusion de masse à 1000+ contacts en un clic</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-slate-600 font-medium flex items-center justify-center gap-2">
              Découvrez Comment NeoChat Résout Tout Ça
              <span className="text-2xl">⬇️</span>
            </p>
          </div>
        </div>
      </section>

      {/* Section Fonctionnalités Clés */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Tout Ce Dont Vous Avez Besoin Pour{" "}
              <span className="bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
                Dominer WhatsApp
              </span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Une suite complète d'outils pour automatiser vos ventes et votre support client
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: Assistant IA */}
            <Card className="border-2 border-purple-200 hover:border-purple-400 hover:shadow-xl transition-all duration-300 group">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Assistant IA Ultra-Intelligent</CardTitle>
                <CardDescription className="text-base">
                  Votre bot apprend depuis vos documents (PDF, Texte) et répond automatiquement à vos clients comme si c'était vous. Disponible 24/7, même à 3h du matin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Réponses instantanées (&lt; 2 secondes)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Base de connaissances personnalisée</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Apprentissage depuis vos PDF/Textes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Ton de voix personnalisable</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 2: Diffusion Anti-Spam */}
            <Card className="border-2 border-orange-200 hover:border-orange-400 hover:shadow-xl transition-all duration-300 group">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Megaphone className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Campagnes Marketing Sans Blocage</CardTitle>
                <CardDescription className="text-base">
                  Envoyez des milliers de messages sans être banni grâce au système de variations automatiques (Spintax). Chaque client reçoit un message unique.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>Variations anti-spam automatiques</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>Programmation des envois</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>Ciblage par groupes/contacts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>Statistiques en temps réel</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 3: Tableau de Bord */}
            <Card className="border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 group md:col-span-2 lg:col-span-1">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Pilotage Total de Votre Business</CardTitle>
                <CardDescription className="text-base">
                  Gérez tout depuis une interface simple : instances WhatsApp, campagnes, base de connaissances, statistiques.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Multi-instances WhatsApp</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Historique des conversations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Analytics détaillés</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Gestion des abonnements</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Section Comment Ça Marche */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Démarrez en 3 Étapes Simples{" "}
              <span className="text-orange-600">(Moins de 5 Minutes)</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              De la connexion à vos premières ventes automatiques en quelques clics
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {/* Étape 1 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg relative z-10">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                  <Smartphone className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Connectez Votre WhatsApp
                </h3>
                <p className="text-slate-600">
                  Scannez le QR code ou utilisez le code de jumelage pour lier votre numéro WhatsApp à NeoChat.
                </p>
              </div>
              {/* Connector line (hidden on mobile) */}
              <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-green-300 to-purple-300 -z-10"></div>
            </div>

            {/* Étape 2 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center mb-6 shadow-lg relative z-10">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Configurez Votre Assistant IA
                </h3>
                <p className="text-slate-600">
                  Uploadez vos documents (catalogue, FAQ, prix) pour que l'IA apprenne vos produits et services.
                </p>
              </div>
              {/* Connector line (hidden on mobile) */}
              <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-purple-300 to-orange-300 -z-10"></div>
            </div>

            {/* Étape 3 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mb-6 shadow-lg relative z-10">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
                  <Send className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Lancez Vos Campagnes & Vendez
                </h3>
                <p className="text-slate-600">
                  Créez votre première diffusion ou laissez le bot répondre automatiquement. C'est parti ! 🚀
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <Link href="/register">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-10 py-6 text-lg font-semibold shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                🎯 Je Veux Démarrer Maintenant
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section Pricing */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Des tarifs simples, rentabilisés dès la première vente
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-2">
              Tous les plans incluent 3 jours d'essai gratuit. Annulez quand vous voulez.
            </p>
            <p className="text-sm text-slate-500">
              Réduction de 1 000 FCFA avec un code parrain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Plan 1: Diffusion */}
            <Card className="border-2 border-blue-200 hover:border-blue-300 transition-all">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">📤</span>
                  <CardTitle className="text-2xl">Diffusion</CardTitle>
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-slate-900">5 000</span>
                  <span className="text-slate-600 ml-2">FCFA / mois</span>
                </div>
                <CardDescription className="text-base">
                  Pour envoyer des offres de masse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Campagnes marketing illimitées</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Variations anti-spam (Spintax)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Programmation des envois</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Historique complet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-400">Bot IA automatique</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-400">Base de connaissances</span>
                  </li>
                </ul>
                <Link href="/register" className="block">
                  <Button variant="outline" className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50">
                    Choisir Diffusion
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plan 2: Premium (STAR) */}
            <Card className="border-2 border-orange-400 hover:border-orange-500 transition-all relative scale-105 shadow-2xl bg-gradient-to-br from-orange-50 to-amber-50">
              {/* Badge Populaire */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <Badge className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-4 py-1.5 text-sm font-bold shadow-lg">
                  <Star className="w-4 h-4 mr-1 fill-current" />
                  LE PLUS POPULAIRE
                </Badge>
              </div>
              
              <CardHeader className="pt-8">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-8 h-8 text-orange-600" />
                  <CardTitle className="text-2xl text-orange-600">Premium All-in-One</CardTitle>
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-slate-900">10 000</span>
                  <span className="text-slate-600 ml-2">FCFA / mois</span>
                </div>
                <CardDescription className="text-base font-semibold text-slate-700">
                  La machine de guerre complète
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 font-medium">TOUT Diffusion + Assistant IA</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">Jusqu'à 5 000 messages/mois</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">Support prioritaire VIP</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">Campagnes illimitées</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">Base de connaissances avancée</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">Multi-instances WhatsApp</span>
                  </li>
                </ul>
                <Link href="/register" className="block">
                  <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transition-all">
                    <Rocket className="w-4 h-4 mr-2" />
                    Démarrer avec Premium
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plan 3: Assistant IA */}
            <Card className="border-2 border-purple-200 hover:border-purple-300 transition-all">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-8 h-8 text-purple-600" />
                  <CardTitle className="text-2xl">Assistant IA</CardTitle>
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-slate-900">7 500</span>
                  <span className="text-slate-600 ml-2">FCFA / mois</span>
                </div>
                <CardDescription className="text-base">
                  Pour un support client 24/7
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Réponses automatiques 24/7</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Base de connaissances (PDF/Texte)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Personnalisation de l'IA</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Ton de voix personnalisable</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-400">Campagnes marketing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-400">Variations anti-spam</span>
                  </li>
                </ul>
                <Link href="/register" className="block">
                  <Button variant="outline" className="w-full border-2 border-purple-600 text-purple-600 hover:bg-purple-50">
                    Choisir Assistant IA
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Note psychologique */}
          <div className="text-center mt-12">
            <p className="text-slate-600 bg-orange-50 border border-orange-200 rounded-lg p-4 inline-block">
              💡 <strong>Astuce :</strong> Économisez 2 500 FCFA en choisissant l'offre Premium All-in-One plutôt que Diffusion + Assistant IA séparément !
            </p>
          </div>
        </div>
      </section>

      {/* Section FAQ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Questions Fréquentes
            </h2>
            <p className="text-lg text-slate-600">
              Tout ce que vous devez savoir avant de démarrer
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="border border-slate-200 rounded-lg px-6 bg-slate-50">
              <AccordionTrigger className="text-left font-semibold text-slate-900 hover:text-orange-600">
                Est-ce que je risque d'être banni de WhatsApp ?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                Non. NeoChat utilise un système de variations automatiques (Spintax) qui personnalise chaque message. Chaque destinataire reçoit un texte unique, ce qui évite les blocages pour spam.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-slate-200 rounded-lg px-6 bg-slate-50">
              <AccordionTrigger className="text-left font-semibold text-slate-900 hover:text-orange-600">
                Comment fonctionne l'essai gratuit ?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                Vous bénéficiez de 3 jours d'essai gratuit avec 50 messages inclus (bot + diffusion). Aucune carte bancaire requise. Vous pouvez annuler à tout moment.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-slate-200 rounded-lg px-6 bg-slate-50">
              <AccordionTrigger className="text-left font-semibold text-slate-900 hover:text-orange-600">
                Puis-je utiliser plusieurs numéros WhatsApp ?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                Oui ! Le plan Premium permet de gérer plusieurs instances WhatsApp depuis un seul tableau de bord.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-slate-200 rounded-lg px-6 bg-slate-50">
              <AccordionTrigger className="text-left font-semibold text-slate-900 hover:text-orange-600">
                Comment l'IA apprend mes produits ?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                Vous uploadez vos documents (catalogues PDF, fiches produits, FAQ en texte) et l'IA les analyse pour répondre précisément à vos clients comme si c'était vous.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border border-slate-200 rounded-lg px-6 bg-slate-50">
              <AccordionTrigger className="text-left font-semibold text-slate-900 hover:text-orange-600">
                Quels moyens de paiement acceptez-vous ?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                Nous acceptons Mobile Money (Orange Money, Moov Money, MTN, Wave) et les cartes bancaires via paiement sécurisé.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border border-slate-200 rounded-lg px-6 bg-slate-50">
              <AccordionTrigger className="text-left font-semibold text-slate-900 hover:text-orange-600">
                Puis-je annuler mon abonnement à tout moment ?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                Oui, absolument ! Vous pouvez annuler votre abonnement en 1 clic depuis votre tableau de bord. Aucun frais caché, aucune pénalité.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-orange-500 to-amber-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            🚀 Prêt à Transformer Votre WhatsApp en Machine de Vente Automatique ?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Rejoignez +500 entrepreneurs qui vendent plus grâce à NeoChat. Essai gratuit 3 jours.
          </p>
          
          <Link href="/register">
            <Button 
              size="lg"
              className="bg-white text-orange-600 hover:bg-slate-50 px-10 py-6 text-lg font-semibold shadow-2xl hover:shadow-xl transition-all hover:scale-105 mb-8"
            >
              Démarrer Gratuitement Maintenant
            </Button>
          </Link>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-white/90 text-sm">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Sans carte bancaire</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Annulation en 1 clic</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Support 7j/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Colonne 1: NeoChat */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image 
                  src="/logo-neochat.svg" 
                  alt="Logo NeoChat - Bot WhatsApp et automatisation IA" 
                  width={32} 
                  height={32}
                  className="w-8 h-8"
                />
                <span className="text-xl font-bold text-white">NeoChat</span>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Votre assistant WhatsApp intelligent
              </p>
              <p className="text-sm text-slate-500">
                Fait avec ❤️ pour l'Afrique
              </p>
            </div>

            {/* Colonne 2: Liens Rapides */}
            <div>
              <h3 className="font-semibold text-white mb-4">Liens Rapides</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#pricing" className="hover:text-orange-400 transition-colors">
                    Tarifs
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="hover:text-orange-400 transition-colors">
                    Fonctionnalités
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="hover:text-orange-400 transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-orange-400 transition-colors">
                    Se connecter
                  </Link>
                </li>
              </ul>
            </div>

            {/* Colonne 3: Support */}
            <div>
              <h3 className="font-semibold text-white mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span>📧</span>
                  <span>support@neochat.bj</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>📱</span>
                  <span>+226 56 63 60 39</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🕐</span>
                  <span>Lun-Dim : 8h-20h WAT</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bas du Footer */}
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>© 2026 NeoChat. Tous droits réservés.</p>
            <div className="flex items-center gap-6">
              <Link href="#" className="hover:text-orange-400 transition-colors">
                Conditions d'utilisation
              </Link>
              <Link href="#" className="hover:text-orange-400 transition-colors">
                Politique de confidentialité
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>

    <VideoModal
      isOpen={isVideoOpen}
      onClose={() => setIsVideoOpen(false)}
      videoSrc="/demo-neochat.mp4"
    />
    </>
  );
}
