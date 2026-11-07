# NeoChat — Product Bible

> **Document de référence produit destiné à être consommé par des LLMs.**
> Dernière mise à jour : Avril 2026.

---

## Table des matières

1. [Présentation Globale (Executive Summary)](#1-présentation-globale)
2. [Arborescence des Fonctionnalités Clés](#2-arborescence-des-fonctionnalités-clés)
3. [Le Moteur de Croissance : L'Affiliation](#3-le-moteur-de-croissance--laffiliation)
4. [Modèle Économique (Pricing & Facturation)](#4-modèle-économique)
5. [Le Parcours Utilisateur (User Journey)](#5-le-parcours-utilisateur)

---

## 1. Présentation Globale

### 1.1 Définition

NeoChat est une plateforme SaaS B2B d'automatisation WhatsApp et de service client par intelligence artificielle. Elle permet aux entrepreneurs, commerçants et agences de transformer leur numéro WhatsApp personnel en un canal de vente et de support client automatisé, disponible 24 heures sur 24, 7 jours sur 7.

Le produit se positionne à l'intersection de trois besoins critiques :
- **L'automatisation des réponses clients** via un assistant IA conversationnel personnalisable.
- **Le marketing de masse sur WhatsApp** via un système de campagnes de diffusion anti-spam.
- **La gestion centralisée** de l'ensemble depuis un tableau de bord unique.

### 1.2 Proposition de valeur unique

- **Gain de temps radical** — L'IA répond instantanément (moins de 2 secondes) aux questions des clients, 24h/24, en se basant sur les documents fournis par l'utilisateur (catalogues produits, FAQ, grilles tarifaires).
- **Ventes automatiques 24/7** — Aucune vente perdue la nuit ou le week-end. Le bot traite chaque conversation comme un vendeur formé.
- **Sécurité anti-ban** — Le système de Spintax (variations automatiques de messages) et les délais d'envoi contrôlés protègent le numéro WhatsApp de l'utilisateur contre les blocages imposés par Meta.
- **Campagnes de masse puissantes** — Diffusion à des milliers de contacts avec support d'images, programmation et personnalisation automatique de chaque message.
- **Adapté au marché africain** — Paiement par Mobile Money (Orange Money, Moov, Wave), tarification en FCFA, interface en français, support local.

### 1.3 Marché cible

- **Géographie principale** — Afrique de l'Ouest francophone (Burkina Faso, Côte d'Ivoire, Sénégal, Bénin, Mali, Togo, Guinée).
- **Personas principaux** :
  - **Commerçants et vendeurs en ligne** qui gèrent leur activité principalement via WhatsApp et qui sont submergés par le volume de messages entrants.
  - **Agences marketing** qui gèrent les comptes WhatsApp de plusieurs clients et ont besoin de campagnes de masse professionnelles.
  - **PME et entreprises de services** qui souhaitent offrir un support client automatisé et professionnel sans recruter de personnel dédié.
- **Taille du marché adressable** — +500 entrepreneurs actifs sur la plateforme, +50 000 messages automatisés par mois (chiffres actuels).

---

## 2. Arborescence des Fonctionnalités Clés

### 2.1 Gestion des Instances WhatsApp

Une "instance" représente la connexion entre un numéro WhatsApp et la plateforme NeoChat. Chaque utilisateur connecte son propre numéro WhatsApp pour l'automatiser.

#### Processus de connexion

1. **Création de l'instance** — L'utilisateur saisit un nom pour son instance et son numéro de téléphone WhatsApp.
2. **Code de jumelage dynamique** — Un code à 8 chiffres est généré automatiquement. L'utilisateur le saisit dans WhatsApp (Paramètres > Appareils associés > Associer avec un numéro). C'est la méthode principale, privilégiée pour sa simplicité.
3. **QR Code (méthode alternative)** — Un QR Code est également disponible. L'utilisateur le scanne avec WhatsApp pour associer son appareil.
4. **Polling de statut** — L'interface vérifie automatiquement et en continu le statut de connexion. Dès que WhatsApp confirme l'association, l'instance passe en statut "CONNECTED" et l'utilisateur est notifié.
5. **Rafraîchissement** — Le code de jumelage peut être rafraîchi manuellement si le précédent expire.

#### Statuts possibles d'une instance

- **DISCONNECTED** — L'instance n'est pas connectée à WhatsApp.
- **CONNECTING** — L'instance est en cours de connexion (en attente de scan QR / saisie du code de jumelage).
- **CONNECTED** — L'instance est active et fonctionnelle. Les messages entrants sont traités et le bot peut répondre.

#### Règles métier

- Un utilisateur ne peut posséder qu'**une seule instance** à la fois (sauf plan Premium qui permet le multi-instances).
- L'utilisateur doit supprimer son instance existante avant d'en créer une nouvelle.
- Une notification WhatsApp est envoyée à l'utilisateur lorsque la connexion est établie avec succès.
- Si WhatsApp déconnecte l'instance de manière forcée (session révoquée, changement de téléphone), le système détecte le changement de statut et le signale à l'utilisateur.

---

### 2.2 Le Cerveau IA (Bot Custom)

Le bot IA est le cœur de la proposition de valeur de NeoChat. Il transforme chaque instance WhatsApp en un agent conversationnel intelligent, personnalisé pour le business de l'utilisateur.

#### Le System Prompt (personnalité de l'IA)

- L'utilisateur rédige un "System Prompt" qui définit le comportement, le ton et les consignes de l'IA.
- Exemples de consignes typiques : "Tu es l'assistant commercial de la boutique Fatou Mode. Tu réponds poliment en français. Tu proposes toujours les prix en FCFA. Tu orientes vers le paiement Wave si le client est intéressé."
- Le System Prompt est entièrement libre et personnalisable.

#### La Base de Connaissances

C'est le mécanisme qui permet à l'IA de répondre avec des informations spécifiques au business de l'utilisateur, plutôt que des réponses génériques.

- **Documents acceptés** :
  - **Fichiers PDF** — Catalogues produits, grilles tarifaires, brochures, documents de procédures. Taille maximale : 10 Mo par fichier.
  - **Texte libre** — FAQ, descriptions de services, conditions générales, informations pratiques.
- **Traitement des documents** — Chaque document uploadé est automatiquement découpé en segments, analysé sémantiquement et indexé (vectorisation). L'IA peut ensuite retrouver l'information pertinente pour chaque question posée par un client.
- **Gestion** — L'utilisateur peut ajouter, consulter et supprimer les documents de sa base de connaissances à tout moment.
- **Comportement sans contexte** — Lorsque l'IA ne trouve pas d'information pertinente dans la base de connaissances pour répondre à une question, cet événement est comptabilisé. Cela permet à l'utilisateur de comprendre quels sujets manquent dans sa base documentaire.

#### Activation et désactivation du bot

- Le bot est **désactivé par défaut** à la création d'une instance. L'utilisateur l'active manuellement après avoir configuré son System Prompt et sa base de connaissances.
- Le bot peut être activé/désactivé à tout moment via un simple interrupteur dans l'interface.
- L'activation et la désactivation déclenchent une notification WhatsApp envoyée à l'utilisateur pour confirmation.
- **Restriction par plan** — Seuls les plans Trial, Assistant IA et Premium permettent d'activer le bot. Le plan Diffusion ne donne pas accès à cette fonctionnalité.

#### Traitement des messages entrants

Lorsqu'un message WhatsApp arrive sur une instance connectée :

1. Le système vérifie que le bot est actif.
2. Le système vérifie que l'expéditeur n'est pas dans la blacklist.
3. Le système vérifie que le message provient d'une conversation privée (les messages de groupe sont ignorés).
4. Le système vérifie que le message n'est pas vide et qu'il contient du texte.
5. L'IA génère une réponse en s'appuyant sur le System Prompt et la base de connaissances vectorisée.
6. La réponse est envoyée automatiquement au client via WhatsApp.

---

### 2.3 La Blacklist Intelligente

La blacklist est une fonctionnalité de protection qui permet à l'utilisateur d'empêcher l'IA de répondre à certains numéros spécifiques.

#### Cas d'usage

- **Proches et famille** — Empêcher le bot de répondre automatiquement aux messages personnels.
- **Fournisseurs** — Éviter que l'IA ne réponde de manière inadaptée à des interlocuteurs professionnels qui ne sont pas des clients.
- **Numéros problématiques** — Bloquer des contacts indésirables.

#### Fonctionnement (Search & Select)

1. L'utilisateur accède à la section Blacklist de la configuration de son instance.
2. La liste complète de ses contacts WhatsApp est chargée (noms et numéros).
3. Un champ de recherche permet de filtrer les contacts par nom ou par numéro.
4. L'utilisateur sélectionne ou désélectionne les contacts à blacklister d'un simple clic.
5. La blacklist est sauvegardée. Les numéros blacklistés sont nettoyés, dédupliqués et stockés.
6. Tout message entrant provenant d'un numéro blacklisté est ignoré silencieusement par le bot.

---

### 2.4 Campagnes de Diffusion (Broadcast)

La fonctionnalité de diffusion permet aux utilisateurs d'envoyer des messages WhatsApp en masse à une liste de destinataires, avec des protections anti-ban intégrées.

#### Création d'une campagne

L'utilisateur configure sa campagne avec les éléments suivants :

- **Nom de la campagne** — Pour l'identification et le suivi.
- **Instance WhatsApp** — L'instance depuis laquelle les messages seront envoyés.
- **Message** — Le contenu textuel du message. Supporte le Spintax (voir ci-dessous).
- **Média (optionnel)** — Une image, une vidéo ou un document peut être joint au message.
- **Liste de destinataires** — Un tableau de numéros de téléphone.
- **Date et heure d'envoi programmé** — La campagne est déclenchée à la date et l'heure choisies.

#### Le système Spintax (anti-spam)

Le Spintax est le mécanisme crucial de protection contre les bans Meta. Il permet de rendre chaque message unique pour éviter la détection de spam.

- **Syntaxe** — L'utilisateur utilise des accolades et des pipes pour définir des variantes : `{Bonjour|Salut|Hey|Coucou}`
- **Fonctionnement** — Pour chaque destinataire, le système choisit aléatoirement une variante dans chaque groupe Spintax. Ainsi, sur 500 envois, aucun message n'est identique.
- **Exemple complet** :
  - Message saisi : `{Bonjour|Salut|Hey} ! {Découvrez|Profitez de} nos {nouvelles offres|promotions du jour}. {À bientôt|Cordialement} !`
  - Destinataire A reçoit : "Salut ! Profitez de nos promotions du jour. À bientôt !"
  - Destinataire B reçoit : "Hey ! Découvrez nos nouvelles offres. Cordialement !"

#### Délais d'envoi contrôlés (Rate Limiting)

Pour renforcer la protection anti-ban, le système impose un **délai minimum de 5 secondes entre chaque message** envoyé depuis une même instance. Cela simule un comportement humain et évite les pics d'envoi détectables par Meta.

#### Support des médias

Les campagnes prennent en charge trois types de médias :

- **Image** — Jointe au message avec une légende optionnelle.
- **Vidéo** — Jointe au message avec une légende optionnelle.
- **Document** — Fichier PDF ou autre, joint au message.

#### Gestion du cycle de vie d'une campagne

Une campagne passe par les statuts suivants :

- **PENDING** — Campagne créée, en attente de la date programmée.
- **PROCESSING** — Campagne en cours d'envoi.
- **COMPLETED** — Tous les messages ont été envoyés.
- **PAUSED** — Campagne mise en pause (manuellement ou automatiquement si le quota trial est épuisé).
- **FAILED** — Erreur critique (abonnement expiré, instance non trouvée).

L'utilisateur peut **dupliquer**, **modifier** (si pas encore en cours), **mettre en pause** et **reprendre** une campagne.

#### Limites en période d'essai

- Maximum **10 destinataires** par campagne.
- Maximum **50 messages** au total sur la durée de l'essai (bot + diffusion combinés).
- Une alerte est envoyée à l'utilisateur lorsqu'il atteint 80% de son quota (40/50 messages).
- L'abonnement expire automatiquement lorsque le quota est épuisé.

#### Restriction par plan

- Seuls les plans **Diffusion** et **Premium** (et le Trial en version limitée) donnent accès aux campagnes de diffusion.
- Le plan **Assistant IA** ne donne **pas** accès aux campagnes.

---

## 3. Le Moteur de Croissance : L'Affiliation

NeoChat intègre un programme d'affiliation à **double récompense (Double-Sided Reward)** qui transforme chaque utilisateur en ambassadeur potentiel de la plateforme. Les deux parties — parrain et filleul — sont récompensées, ce qui maximise le taux de conversion des invitations.

### 3.1 Fonctionnement du système de parrainage

1. **Génération automatique du lien** — À l'inscription, chaque utilisateur reçoit un code de parrainage unique (ex: `NEOCHAT7X92`). Ce code peut être personnalisé par l'utilisateur (4 à 20 caractères, lettres majuscules et chiffres uniquement).
2. **Partage** — L'utilisateur partage son lien de parrainage ou son code. Le lien redirige vers la page d'inscription avec le code pré-rempli.
3. **Inscription du filleul** — Lorsqu'un nouvel utilisateur s'inscrit avec un code parrain, le lien est établi de manière permanente entre le parrain et le filleul.

### 3.2 La mécanique Double-Sided Reward

Le programme d'affiliation repose sur un système de récompense bilatérale où **les deux côtés de la relation y gagnent** :

#### Côté Parrain — Commission de 20%

- **Taux de commission** — **20%** du montant brut de chaque paiement effectué par le filleul est crédité au parrain.
- **Crédit instantané** — La commission est calculée et ajoutée au portefeuille (wallet) du parrain immédiatement après la validation du paiement du filleul.
- **Commission récurrente** — La commission s'applique à **chaque** paiement du filleul, pas seulement au premier. Si le filleul renouvelle son abonnement chaque mois, le parrain reçoit 20% chaque mois, indéfiniment.
- **Exemple concret** — Un filleul souscrit au plan Premium à 10 000 FCFA/mois. Le parrain reçoit **2 000 FCFA/mois** tant que le filleul reste abonné.

#### Côté Filleul — Réduction immédiate de 10%

- **Réduction automatique** — Le filleul bénéficie d'une **réduction de 10%** appliquée automatiquement sur le montant de son abonnement lorsqu'il utilise un code de parrainage à l'inscription.
- **Application immédiate** — La réduction est appliquée dès le premier paiement, directement sur la page de checkout. Le filleul voit le prix barré et le prix réduit avant de payer.
- **Exemples par plan** :
  - Plan Diffusion : 5 000 FCFA → **4 500 FCFA** (économie de 500 FCFA).
  - Plan Assistant IA : 7 500 FCFA → **6 750 FCFA** (économie de 750 FCFA).
  - Plan Premium : 10 000 FCFA → **9 000 FCFA** (économie de 1 000 FCFA).

#### Résumé du Double-Sided Reward

| Bénéficiaire | Récompense | Moment du déclenchement | Récurrence |
|---|---|---|---|
| **Parrain** | 20% de commission sur le montant payé | À chaque paiement validé du filleul | Récurrente (chaque renouvellement) |
| **Filleul** | 10% de réduction sur le prix de l'abonnement | Au moment du checkout | À chaque paiement tant que le code est lié |

### 3.3 Portefeuille (Wallet) et retraits

- Chaque utilisateur dispose d'un portefeuille virtuel affichant son solde de commissions accumulées.
- Le tableau de bord d'affiliation affiche :
  - Le nombre total de filleuls.
  - Les gains du mois en cours.
  - Les gains totaux cumulés.
  - L'historique complet des commissions.
- **Demande de retrait** — L'utilisateur peut demander un retrait de son solde. Il renseigne ses informations de paiement (nom, numéro, méthode préférée). Les retraits sont traités manuellement par l'équipe NeoChat via le panneau d'administration.
- **Méthodes de retrait disponibles** — Orange Money, Moov Money, Wave, et autres méthodes de paiement mobile.

---

## 4. Modèle Économique

### 4.1 Structure des plans

NeoChat propose **un essai gratuit** et **trois plans payants** avec facturation mensuelle en Francs CFA (XOF).

#### Essai Gratuit (Trial)

- **Durée** — 3 jours.
- **Quota** — 50 messages (bot + diffusion combinés).
- **Fonctionnalités incluses** — Toutes les fonctionnalités sont accessibles : bot IA, campagnes de diffusion (limitées à 10 destinataires par campagne), base de connaissances, blacklist.
- **Aucun moyen de paiement requis** à l'inscription.
- **Expiration** — L'essai expire automatiquement après 3 jours OU lorsque le quota de 50 messages est atteint, selon ce qui arrive en premier. Le statut passe alors à "EXPIRED".

#### Plan Diffusion — 5 000 FCFA/mois

- **Public cible** — Utilisateurs qui souhaitent uniquement envoyer des campagnes marketing de masse.
- **Fonctionnalités incluses** :
  - Campagnes de diffusion illimitées.
  - Variations anti-spam (Spintax).
  - Programmation des envois.
  - Historique complet des campagnes.
- **Fonctionnalités exclues** :
  - Bot IA conversationnel.
  - Base de connaissances.

#### Plan Assistant IA — 7 500 FCFA/mois

- **Public cible** — Utilisateurs qui souhaitent un support client automatisé 24/7.
- **Fonctionnalités incluses** :
  - Bot IA conversationnel.
  - Base de connaissances illimitée (PDF + Texte).
  - Réponses automatiques 24/7.
  - Personnalisation complète de l'IA (System Prompt).
  - Support prioritaire.
- **Fonctionnalités exclues** :
  - Campagnes de diffusion.
  - Variations anti-spam (Spintax).

#### Plan Premium — 10 000 FCFA/mois

- **Public cible** — Utilisateurs qui veulent l'ensemble complet : bot IA + campagnes de diffusion.
- **Fonctionnalités incluses** :
  - **Toutes** les fonctionnalités des plans Diffusion et Assistant IA combinés.
  - Multi-instances WhatsApp.
  - Support VIP prioritaire.
  - Base de connaissances avancée.
  - Campagnes illimitées.
- **Argument commercial** — Économie de 2 500 FCFA/mois par rapport à la souscription séparée des plans Diffusion + Assistant IA.

### 4.2 Matrice des fonctionnalités par plan

| Fonctionnalité | Trial | Diffusion | Assistant IA | Premium |
|---|---|---|---|---|
| Instance WhatsApp | 1 | 1 | 1 | Multi |
| Bot IA conversationnel | Oui (50 msg) | Non | Oui | Oui |
| Base de connaissances | Oui | Non | Oui | Oui |
| Campagnes de diffusion | Oui (10 dest.) | Illimité | Non | Illimité |
| Spintax anti-spam | Oui | Oui | Non | Oui |
| Blacklist | Oui | Oui | Oui | Oui |
| Support média (image/vidéo/doc) | Oui | Oui | — | Oui |
| Programmation d'envois | Oui | Oui | — | Oui |
| Programme d'affiliation | Oui | Oui | Oui | Oui |
| Support prioritaire | Non | Standard | Standard | VIP |

### 4.3 Facturation et paiement

#### Passerelle de paiement

NeoChat utilise **Maketou** comme passerelle de paiement. Maketou est un agrégateur de paiement adapté au marché africain qui supporte :

- **Orange Money**
- **Moov Money**
- **Wave**
- **Visa / Mastercard**

#### Flux de paiement

1. L'utilisateur choisit un plan et clique sur "Payer".
2. Le système génère un lien de paiement sécurisé via Maketou.
3. L'utilisateur est redirigé vers la page de paiement Maketou où il choisit son moyen de paiement préféré.
4. Après validation du paiement, Maketou envoie une notification (webhook) au serveur NeoChat.
5. L'abonnement est activé instantanément et l'utilisateur est notifié par WhatsApp.
6. Si le paiement échoue, l'utilisateur est également notifié.

#### Cycle de facturation

- **Durée** — 30 jours à compter de la date du paiement.
- **Renouvellement** — L'utilisateur doit repayer manuellement pour renouveler. Il n'y a pas de prélèvement automatique récurrent.
- **Expiration** — Si l'abonnement n'est pas renouvelé à la fin du cycle de 30 jours, le statut passe à "EXPIRED" et les fonctionnalités payantes sont désactivées.

#### Réduction parrainage (Double-Sided Reward — côté filleul)

- Si l'utilisateur s'est inscrit via un code parrain, une **réduction de 10%** est automatiquement appliquée sur le montant de son abonnement.
- Le prix final affiché intègre la réduction. Exemples :
  - Diffusion : 5 000 → **4 500 FCFA** (-500 FCFA).
  - Assistant IA : 7 500 → **6 750 FCFA** (-750 FCFA).
  - Premium : 10 000 → **9 000 FCFA** (-1 000 FCFA).

---

## 5. Le Parcours Utilisateur

### 5.1 Parcours d'inscription

1. **Découverte** — L'utilisateur arrive sur la page d'accueil (neochat.pro) depuis une recherche, une publicité, ou un lien de parrainage.
2. **Inscription** — Il saisit son numéro de téléphone (et optionnellement un code parrain).
3. **Vérification OTP** — Un code à usage unique (OTP) est envoyé sur son WhatsApp. Il le saisit pour valider son identité.
4. **Compte créé** — Le compte est créé automatiquement avec un essai gratuit de 3 jours et 50 messages. Un message de bienvenue lui est envoyé sur WhatsApp.

### 5.2 Parcours d'activation (Aha Moment)

5. **Connexion WhatsApp** — L'utilisateur crée une instance et connecte son numéro WhatsApp via le code de jumelage ou le QR code.
6. **Configuration de l'IA** — Il rédige son System Prompt et uploade ses documents (catalogue PDF, FAQ texte, grille tarifaire).
7. **Activation du bot** — Il active le bot d'un clic. L'IA commence à répondre automatiquement aux messages entrants.
8. **Premier message traité** — Le bot reçoit et traite son premier message client. C'est le "Aha Moment" — l'utilisateur réalise la valeur concrète du produit.

### 5.3 Parcours de croissance

9. **Première campagne** — L'utilisateur crée sa première campagne de diffusion avec Spintax et la programme.
10. **Configuration de la blacklist** — Il protège ses proches et fournisseurs du bot automatique.
11. **Ajout de documents** — Il enrichit sa base de connaissances au fil du temps pour des réponses de plus en plus précises.

### 5.4 Parcours de monétisation

12. **Fin de l'essai** — Après 3 jours ou 50 messages, l'utilisateur est invité à choisir un plan payant.
13. **Paiement** — Il sélectionne son plan, est redirigé vers Maketou, et paie via Mobile Money ou carte.
14. **Abonnement activé** — L'accès complet est débloqué immédiatement. Notification WhatsApp de confirmation.
15. **Parrainage** — L'utilisateur partage son code d'affiliation pour gagner 20% de commission sur chaque paiement de ses filleuls.
16. **Renouvellement mensuel** — Chaque mois, l'utilisateur renouvelle son abonnement pour maintenir l'accès.

### 5.5 Indicateurs clés du parcours

| Étape | Indicateur de succès |
|---|---|
| Inscription | Compte créé + OTP validé |
| Activation | Instance connectée (statut CONNECTED) |
| Aha Moment | Premier message traité par le bot |
| Conversion | Premier paiement effectué |
| Rétention | Renouvellement mensuel |
| Viralité | Premier filleul inscrit via le code parrain |

---

## Annexe : Notifications WhatsApp Automatiques

NeoChat envoie des notifications automatiques aux utilisateurs via WhatsApp pour les événements clés suivants :

- **Code OTP** — Envoi du code de vérification à l'inscription/connexion.
- **Message de bienvenue** — Après la première inscription réussie.
- **Instance connectée** — Confirmation de la connexion WhatsApp.
- **Changement de statut du bot** — Confirmation d'activation ou de désactivation.
- **Paiement réussi** — Confirmation de la souscription ou du renouvellement.
- **Paiement échoué** — Notification en cas d'échec de paiement.
- **Confirmation code promo** — Si l'utilisateur bénéficie d'une réduction parrainage.
- **Alerte quota 80%** — Avertissement en période d'essai quand 80% du quota est consommé.
- **Quota épuisé** — Notification quand le quota trial est entièrement consommé.
- **Campagne terminée** — Résumé de la campagne avec le nombre de messages envoyés.

---

## Annexe : Glossaire

| Terme | Définition |
|---|---|
| **Instance** | La connexion entre un numéro WhatsApp et la plateforme NeoChat. |
| **System Prompt** | Les instructions textuelles qui définissent la personnalité, le ton et le comportement de l'IA. |
| **Base de connaissances** | L'ensemble des documents (PDF, texte) uploadés pour éduquer l'IA sur le business de l'utilisateur. |
| **Vectorisation** | Le processus automatique de découpage et d'indexation sémantique des documents pour permettre à l'IA de retrouver l'information pertinente. |
| **Spintax** | Syntaxe de variations `{option1|option2|option3}` qui génère un message unique pour chaque destinataire afin d'éviter la détection de spam. |
| **Blacklist** | Liste de numéros de téléphone auxquels le bot ne doit jamais répondre. |
| **Wallet** | Portefeuille virtuel de l'utilisateur où s'accumulent les commissions d'affiliation. |
| **Maketou** | Passerelle de paiement africaine utilisée pour traiter les transactions (Mobile Money, carte bancaire). |
| **OTP** | One-Time Password. Code à usage unique envoyé par WhatsApp pour authentifier l'utilisateur. |
| **FCFA (XOF)** | Franc CFA Ouest-Africain. Devise utilisée pour toute la tarification NeoChat. |
| **Trial** | Période d'essai gratuite de 3 jours avec 50 messages maximum. |
| **Aha Moment** | Moment où l'utilisateur constate la valeur du produit pour la première fois (premier message traité par le bot). |
| **Rate Limiting** | Délai minimum de 5 secondes entre chaque envoi de message pour protéger contre les bans WhatsApp. |
