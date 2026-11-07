# FICHE PROJET : NeoChat (neochat.pro & UAUBEN WhatsApp Automation)

---

## 1. Contexte & Problème Métier

### Client / Utilisateurs cibles
Le système s’adresse à deux profils complémentaires sur le marché d'Afrique de l'Ouest (Burkina Faso, Côte d'Ivoire, Sénégal, Bénin, Mali, Togo) :
1. **PME, Commerçants et Solopreneurs E-commerce (B2B SaaS) :** Vendeurs indépendants, créateurs de marques et agences de marketing digital/community managers gérant leurs ventes et leur relation client quasi-exclusivement sur **WhatsApp** et via des marketplaces comme *NeoShop*.
2. **Grandes Organisations & Institutions :** Déploiement institutionnel pour le secrétariat et le Bureau de Gestion des Étudiants (BGE) de l’**Université Aube Nouvelle (UAUBEN)** à Ouagadougou, accueillant des milliers d'étudiants, candidats et parents d'élèves.

### Le problème avant notre intervention
- **Submersion par les requêtes répétitives :** Un commerçant ou un secrétariat d'université recevait entre 50 et 150 messages WhatsApp par jour avec les mêmes questions en boucle (*« C'est combien ? »*, *« Livrez-vous à Ouaga 2000 ? »*, *« Quels sont les frais d'inscription en Master ? »*, *« Quels sont les horaires ? »*).
- **Files d'attente et registres manuels :** À l'université, les étudiants devaient se déplacer physiquement et faire la queue pendant des heures pour obtenir une simple attestation, une note de service ou un planning d'examens.
- **Perte de ventes la nuit et le week-end :** Plus de 40% des prospects écrivent entre 20h et 2h du matin. En l'absence de réponse immédiate, l'acheteur potentiel contactait un concurrent ou abandonnait son panier.
- **Le cauchemar des blocages WhatsApp (Meta Bans) :** Pour informer leurs clients des arrivages ou promotions, les utilisateurs utilisaient des listes de diffusion natives ou des outils pirates de broadcast. Conséquence : Meta détectait les messages identiques répétitifs et bannissait sans préavis leur numéro professionnel principal.

### Impact financier ou opérationnel du problème
- **Perte de 30% à 50% de chiffre d'affaires potentiel** non converti faute de réactivité en dehors des heures de bureau.
- **5 à 8 heures de travail quotidien perdues** par les équipes à taper les mêmes réponses au lieu de se consacrer à la prospection, à la négociation ou au traitement des dossiers administratifs à forte valeur ajoutée.
- **Risque d'arrêt d'activité immédiat** en cas de bannissement du numéro WhatsApp par Meta (perte de l'historique client et de la réputation de marque).

---

## 2. Architecture & Choix Techniques

```
  ┌────────────────────────────────────────────────────────┐
  │         Frontend: Next.js 14 (App Router) + PWA        │
  │      Tailwind CSS / Shadcn UI / Zustand / PostHog      │
  └───────────────────────────┬────────────────────────────┘
                              │ HTTPS / Reverse Proxy
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │         Backend: Express.js (TypeScript) + BullMQ      │
  │  - Rate Limiter Anti-Ban (5s)   - Spintax Parser       │
  │  - WhatsApp System Notifications - Mobile Money Webhook│
  └───────────┬───────────────────────┬────────────────────┘
              │                       │
      Prisma ORM (PostgreSQL)         │ REST / Webhooks
              ▼                       ▼
  ┌────────────────────────┐  ┌────────────────────────────────┐
  │ PostgreSQL 16          │  │  Services Externes & Moteurs   │
  │ + pgvector             │  │  - Evolution API (Baileys)     │
  │ (Embeddings 1536-dim)  │  │  - OpenAI / Google Gemini OCR  │
  │ + Relations & Sessions │  │  - Maketou API (Mobile Money)  │
  └────────────────────────┘  └────────────────────────────────┘
```

### Stack Frontend
- **Framework :** Next.js 14 (App Router) avec TypeScript.
- **UI & Design System :** Tailwind CSS, Radix UI primitives et Shadcn UI pour une ergonomie rapide, mobile-first et accessible.
- **State Management & Formulaires :** Zustand pour la synchronisation réactive de la session et de l'instance WhatsApp ; React Hook Form couplé à Zod pour la validation stricte des formulaires.
- **Mobile Native via PWA :** `next-pwa` configuré pour permettre l'installation instantanée en un clic sur l'écran d'accueil du smartphone sans friction de store applicatif.
- **Téléphonie & Internationalisation :** `libphonenumber-js` et `react-international-phone` configurés avec détection et verrouillage natif des indicatifs de la sous-région (+226 BF, +225 CI, +221 SN, etc.).
- **Analytics :** Intégration PostHog client/serveur pour tracker le tunnel d'onboarding et l'usage des fonctionnalités.

### Stack Backend & BDD
- **Runtime & Framework :** Node.js 20+ avec Express en TypeScript strict.
- **ORM & Base de données :** Prisma ORM 5.7+ sur **PostgreSQL 16**.
- **Extension Vectorielle (RAG) :** Extension `pgvector` activée en base (`vector(1536)`) pour l'indexation sémantique des documents et la recherche par similarité cosinus.
- **File d'attente distribuée & Cache :** Redis 7 + BullMQ 4 (`bullmq`) pour le traitement asynchrone des campagnes de masse, l'ordonnancement des diffusions et la protection anti-ban.
- **Moteurs d'IA & Vision Multimodale :** 
  - GPT-4o-mini / OpenRouter pour l'inférence conversationnelle temps réel du bot client.
  - Google Gemini Multimodal Vision / OCR pour l'extraction de texte haute fidélité sur les documents institutionnels scannés et notes de service officielles avec tampons (déploiement UAUBEN).
- **Passerelle WhatsApp :** **Evolution API** (moteur Baileys open-source conteneurisé) assurant l'abstraction du protocole WhatsApp multi-device.
- **Paiements :** API Maketou (Orange Money, Wave, Moov Money) avec gestion des webhooks de confirmation asynchrones.

### Contraintes spécifiques
- **Connexion WhatsApp 100% Mobile (Pairing Code) :** En Afrique de l'Ouest, les commerçants n'ont souvent qu'un seul smartphone et pas d'ordinateur à disposition. Scanner un QR Code affiché sur l'écran du même téléphone est physiquement impossible. Le système a été architecturé autour du **Code de Jumelage (Pairing Code)** à 8 chiffres (génération automatique, copie en 1 clic, saisie directe dans WhatsApp).
- **Protection Anti-Ban Meta (Meta Anti-Spam) :**
  - Moteur **Spintax** dynamique récursif (génération d'une variation syntaxique unique par destinataire : `{Bonjour|Salut} {cher client|ami}`).
  - **Rate Limiting physique strict :** File d'attente BullMQ imposant un délai incompressible minimum de 5 secondes entre chaque message émis depuis une même instance.
- **Authentification Passwordless & OTP 100% WhatsApp :**
  - Les SMS GSM traditionnels sont coûteux (20-30 FCFA/SMS) et ont un taux d'échec d'acheminement important via les opérateurs télécoms locaux.
  - NeoChat a implémenté un système d'authentification OTP à 6 chiffres transmis directement par WhatsApp via une instance système dédiée (`NeoChat_System`).

### Sécurité mise en place
- **Authentification & Sessions :** Tokens JWT signés côté serveur avec rotation, stockés en cookies HttpOnly sécurisés, et middleware d'interception `authenticateToken`.
- **Isolation Multi-Tenant Stricte :** Chaque requête aux instances, documents vectoriels et campagnes filtre impérativement par `userId` et `instanceId` en base.
- **RBAC (Role-Based Access Control) Institutionnel :** Gestion fine des droits dans le portail d'administration distinguant `SUPER_ADMIN`, `COORDINATEUR`, `BGE`, `SECRETARY` et `USER`.
- **Hiérarchie d'autorité du Prompt (Anti-Conflit RAG) :** Les annonces express publiées par l'administration écrasent toute information contradictoire issue des documents PDF archivés afin d'empêcher les hallucinations ou la diffusion de dates obsolètes.

---

## 3. Les "War Stories" (Les Défis Techniques Réels)

### Le plus gros bug ou challenge technique rencontré pendant le dev

#### 1. La Race Condition critique du "Pairing Code vs QR Code" (Evolution API / Baileys)
* **Le problème :** Lors de la création d'une instance sur Evolution API, le moteur Baileys sous-jacent initialisait immédiatement la génération d'un QR code par défaut. Quand le backend demandait quelques millisecondes plus tard le Pairing Code à 8 chiffres pour l'utilisateur mobile, l'instance était déjà verrouillée dans l'état interne *QR_READY*. Baileys rejetait alors l'appel avec l'erreur : `"L'instance est en mode QR Code, pas en mode Pairing Code"`. Les utilisateurs sur smartphone étaient dans l'incapacité totale de connecter leur numéro.
* **La solution :** Refonte complète de la cinématique dans `instanceRoutes.ts`. Implémentation d'un délai d'attente déterministe de 2 000 ms permettant à l'instance Evolution d'atteindre un état réceptif stable, suivi de la génération *automatique et synchrone* du Pairing Code renvoyé directement dans la charge utile de réponse HTTP `POST /instances/create`. Le QR code n'a plus le temps d'interférer, et l'utilisateur reçoit son code à 8 chiffres instantanément à l'écran sans aucun clic supplémentaire.

#### 2. Le bug du Worker de Diffusion (Compteur figé à 1 et Statut bloqué en "En traitement")
* **Le problème :** En production, lors des campagnes de diffusion de 500 messages, le tableau de bord restait bloqué à `1 envoyé` et le statut final demeurait indéfiniment sur `PROCESSING`. La cause venait d'une condition concurrente entre le worker BullMQ, l'absence de transaction atomique sur les écritures et une condition `if (status !== 'PAUSED')` qui court-circuitait le passage à l'état final.
* **La solution :** Réécriture de la boucle d'exécution dans `campaignWorker.ts` avec un accumulateur local persistant (`successCount`), synchronisation explicite après chaque lot d'envoi et forçage garanti du statut `COMPLETED` à la sortie de file, déclenchant l'envoi immédiat du récapitulatif de fin de campagne par notification WhatsApp via `SystemMessagesService.sendBroadcastComplete`.

### Ce qui fait la fierté de l'équipe dans ce code
1. **Le Pipeline RAG Hybride avec Gemini Multimodal Vision & pgvector :**
   La capacité de prendre un document officiel scanné de l'université (souvent de mauvaise qualité, tamponné manuellement), de le transcrire avec fidélité via l'OCR multimodal de Gemini, de le segmenter sémantiquement dans `pgvector` et de le croiser en temps réel avec des *Annonces Express* prioritaires. Avec un seuil de coupure cosinus réglé à 0.3, le bot répond avec une précision chirurgicale et formule poliment son incapacité s'il ne dispose pas de l'information, éliminant tout risque d'hallucination commerciale ou administrative.
2. **Le Double-Sided Reward Engine (Moteur de Croissance Virale) :**
   Un algorithme d'affiliation bilatérale où chaque transaction d'un filleul crédite instantanément 20% de commission récurrente dans le portefeuille Mobile Money du parrain tout en accordant 10% de réduction immédiate au filleul au checkout, le tout synchronisé en temps réel avec le webhook Maketou.

---

## 4. Métriques & Résultats Chiffrés en Production

### Nombre d'utilisateurs actifs ou transactions
- **+500 commerçants et PME** enregistrés et actifs sur la plateforme SaaS.
- **+50 000 messages WhatsApp automatisés** traités mensuellement par les agents IA conversationnels.
- **Campus UAUBEN complet :** Des milliers d'étudiants servis 24h/24 pour l'accès aux notes de service, programmes d'examens et démarches d'inscription.
- **Délivrabilité des campagnes :** Taux de succès de transmission supérieur à **98%** sur des listes de diffusion de 500+ contacts par lot.

### Gains concrets mesurés
- **Temps économisé :** **5 à 8 heures par semaine** récupérées par entrepreneur ou agent administratif.
- **Temps de réponse client :** Chute de **2 à 4 heures** en moyenne (avec pics de retard le week-end) à **moins de 3 secondes** 24h/24 et 7j/7.
- **Protection du capital contact :** **0 bannissement de numéro WhatsApp** recensé en production parmi les utilisateurs respectant le protocole Spintax et le cadenceur BullMQ (5s/msg).
- **Revenus nocturnes :** Augmentation mesurée de **30% à 40% des conversions** réalisées entre 21h00 et 07h00 du matin.

### Retour du client (Verbatims)
> *« Dès la première semaine, j'ai vu sur mon téléphone qu'une commande complète de 130 000 FCFA s'était conclue à 2h du matin pendant que je dormais : l'IA a donné les prix, les tailles disponibles depuis mon catalogue PDF et a orienté vers mon compte Wave. NeoChat ne dort jamais. »*  
> — **Vendeuse partenaire e-commerce (Ouagadougou / Abidjan)**

> *« Lors de la semaine de rentrée, le secrétariat était d'ordinaire submergé par des centaines d'étudiants posant exactement les mêmes questions sur les frais de scolarité et les dates de concours. Grâce au bot WhatsApp NeoChat UAUBEN, plus de 80% des demandes courantes ont été résolues en quelques secondes sur le téléphone des étudiants sans qu'aucun n'ait besoin de faire la queue. »*  
> — **Responsable BGE / Administration UAUBEN**

---

## 5. Ce qu'on ferait différemment (Retours d'expérience)

1. **Persistance "Database-First" stricte dès le premier jour :**
   Dans les phases initiales, les campagnes et états de diffusion étaient temporairement maintenus dans des structures en mémoire (`Map<string, Campaign>`) avant d'être synchronisés. Lors d'un redémarrage serveur inattendu via PM2, certaines métriques en transit ont été perdues. *Leçon : Toute entité métier ou file d'état doit être persistée de manière immuable en base de données PostgreSQL ou Redis dès sa création.*
2. **Canal de secours SMS (Fallback Hybride) pour l'OTP système :**
   Le choix d'envoyer l'intégralité des OTP d'inscription via l'instance WhatsApp `NeoChat_System` s'est avéré très économique mais créait un point de défaillance unique (*Single Point of Failure*) si l'instance système subissait une déconnexion de session Baileys. *Leçon : Mettre en place un fallback automatique vers une passerelle SMS transactionnelle (ex: Infobip / Orange API SMS) déclenché si l'instance WhatsApp système ne confirme pas la distribution sous 15 secondes.*
3. **WebSockets / Server-Sent Events (SSE) au lieu du polling court :**
   Pour actualiser le statut de la connexion WhatsApp ou la validation d'un paiement Mobile Money, le frontend utilisait initialement un polling HTTP toutes les 10 secondes. Bien que fonctionnel, cela générait des requêtes superflues sur des réseaux mobiles africains parfois saturés. *Leçon : Adopter dès l'architecture initiale des WebSockets ou SSE pour diffuser les changements d'états d'instances et de facturation en temps réel de manière plus sobre en bande passante.*
