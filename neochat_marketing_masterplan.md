# NeoChat — Marketing Master Plan
## Document de Référence Stratégique

> **Version :** 1.0 — Avril 2026
> **Auteur :** CMO Strategy Document (généré depuis le code source)
> **Usage :** Base de données contexte pour toute stratégie d'acquisition, copywriting et ventes.

---

## Table des Matières

1. [Executive Summary & UVP](#1-executive-summary--uvp)
2. [Buyer Personas](#2-buyer-personas)
3. [Mapping Fonctionnalités → Bénéfices](#3-mapping-fonctionnalités--bénéfices-marketing)
4. [Moteur de Croissance](#4-le-moteur-de-croissance-affiliation--pricing)
5. [Contexte du Marché](#5-contexte-du-marché--locéan-bleu)

---

## 1. Executive Summary & UVP

### 1.1 Elevator Pitch

> **« NeoChat transforme ton WhatsApp en employé qui vend, répond et prospecte 24h/24 — sans salaire, sans congé, sans erreur. »**

### 1.2 Promesse de Valeur Principale

NeoChat ne vend **pas** un chatbot. NeoChat vend :

- **Du chiffre d'affaires la nuit** — L'assistant IA répond aux clients à 2h du matin avec la même précision qu'à 10h. Chaque message non répondu est une vente perdue. NeoChat les capture toutes.
- **Du temps libéré** — Plus besoin de copier-coller les mêmes réponses 50 fois par jour. Le bot, alimenté par la base de connaissances du commerçant (PDF catalogue, fiches produit, FAQ), répond à sa place.
- **De la tranquillité d'esprit** — Le système de notifications WhatsApp (connexion/déconnexion, rapports de campagne, alertes quota) informe le propriétaire en temps réel sans qu'il ait besoin d'ouvrir un dashboard.
- **Une force de frappe marketing** — La diffusion WhatsApp avec Spintax permet d'envoyer 1 000 messages personnalisés sans se faire bloquer, avec images, vidéos ou documents joints.

### 1.3 Résumé Technique de l'Offre

| Composant | Technologie réelle (code source) |
|---|---|
| IA Conversationnelle | Pipeline RAG : OpenRouter (GPT-4o-mini) + embeddings vectoriels (pgvector) + KnowledgeDocuments |
| Connexion WhatsApp | Evolution API (open-source) avec Pairing Code automatique |
| Diffusion Marketing | Campagnes programmées + Spintax + médias (image/vidéo/document) + rate limiting (5s/msg) |
| Paiement | Maketou API (mobile money Afrique de l'Ouest) — webhook temps réel |
| File d'attente | BullMQ + Redis — envoi séquentiel anti-ban |
| Notifications système | Messages WhatsApp automatiques (OTP, bienvenue, alertes, rapports) |

---

## 2. Buyer Personas

### Persona A — Le Solopreneur E-commerce (« Fatou la Businesswoman »)

**Profil :** Femme, 25-40 ans, vend des vêtements / cosmétiques / accessoires sur WhatsApp et Instagram. Gère seule son business depuis son téléphone. Basée à Ouagadougou ou Abidjan. Chiffre d'affaires : 200k-2M FCFA/mois.

**Comportement digital :** WhatsApp est son outil principal de vente. Elle a entre 500 et 3 000 contacts clients. Elle poste des statuts WhatsApp quotidiennement. Elle utilise déjà les listes de diffusion manuelles.

#### Pain Points (Douleurs)

- **Perte de ventes la nuit et pendant les prières** — Elle reçoit des messages à 23h ou pendant la prière du vendredi. Quand elle répond 2h plus tard, le client a déjà acheté ailleurs.
- **Épuisement par la répétition** — Elle répond « C'est combien ? », « Vous livrez où ? », « C'est disponible ? » 40 à 80 fois par jour, manuellement.
- **Blocages WhatsApp** — Quand elle envoie la même promo à ses 500 contacts via liste de diffusion native, son numéro se fait signaler et bloquer temporairement.
- **Pas de catalogue centralisé** — Ses infos produits sont dispersées dans des notes, des captures d'écran et sa mémoire. Impossible de déléguer.
- **Pas de suivi** — Elle ne sait pas combien de messages sa « campagne » a vraiment touchés.

#### Objections Principales

- *« Et si l'IA répond n'importe quoi à mon client ? »* → Réponse : L'IA utilise **uniquement** la base de connaissances que tu fournis (pipeline RAG, `threshold: 0.3`). Si elle ne trouve pas la réponse dans tes documents, elle dit poliment qu'elle ne sait pas. Zéro hallucination commerciale.
- *« C'est trop cher pour moi »* → Réponse : 5 000 FCFA/mois pour la Diffusion, c'est le prix d'un plat au restaurant. Une seule vente récupérée la nuit rembourse l'abonnement annuel.
- *« Je ne suis pas technique »* → Réponse : L'inscription se fait par OTP WhatsApp, la connexion par code de jumelage à 8 chiffres. Pas d'email, pas de mot de passe. Upload un PDF de ton catalogue et c'est parti.

#### "Aha! Moment"

> **Le premier message client reçu et traité automatiquement à 2h du matin, avec la bonne réponse produit + prix.** Elle voit le lendemain dans ses messages WhatsApp que le bot a répondu parfaitement à un client pendant qu'elle dormait. C'est le moment où elle comprend que NeoChat est un investissement, pas une dépense.

#### Plan Cible : **ASSISTANT** (7 500 FCFA/mois) ou **PREMIUM** (10 000 FCFA/mois)

---

### Persona B — Le Gérant de Boutique Physique (« Ibrahim le Commerçant »)

**Profil :** Homme, 30-50 ans, possède une boutique physique (électronique, téléphones, vêtements). A un numéro WhatsApp Business que ses clients connaissent. Basé dans un quartier commercial de Bobo-Dioulasso ou Bamako. Chiffre d'affaires : 500k-5M FCFA/mois.

**Comportement digital :** Utilise WhatsApp pour annoncer les arrivages et promotions. Envoie des messages vocaux et photos à ses clients réguliers. A entre 1 000 et 5 000 contacts.

#### Pain Points (Douleurs)

- **Impossible de prospecter efficacement** — Il a une liste de 2 000 contacts mais envoyer un message à chacun lui prendrait une journée entière.
- **Arrivages non communiqués** — Quand un nouveau stock arrive, il n'a pas le temps de prévenir tous ses clients. Les produits partent lentement.
- **Concurrence agressive** — Les concurrents qui communiquent plus vite captent ses anciens clients.
- **Dépendance à un employé** — S'il confie le téléphone à un employé pour répondre, les réponses sont souvent incorrectes (mauvais prix, mauvais stock).

#### Objections Principales

- *« Mon business marche déjà sans ça »* → Réponse : Il marche, mais combien de clients achètent chez ton concurrent parce qu'il a répondu plus vite ? NeoChat ne remplace pas ton business, il l'accélère.
- *« WhatsApp va bloquer mon numéro »* → Réponse : Le Spintax génère un message **unique** pour chaque destinataire (`{Salut|Bonjour|Hello} {cher client|boss|mon ami}`). Le rate limiter envoie 1 message toutes les 5 secondes via BullMQ. C'est conçu pour éviter les bans.
- *« Je préfère appeler mes clients »* → Réponse : Tu peux appeler tes 10 meilleurs clients. Pour les 2 000 autres, NeoChat envoie ta promo en 3 heures pendant que tu es en boutique.

#### "Aha! Moment"

> **Sa première campagne de diffusion : 500 messages envoyés en 45 minutes avec un arrivage photo, et il reçoit 30 appels dans l'heure.** Le rapport de campagne arrive sur WhatsApp : *« ✅ 500/500 messages envoyés, taux de réussite 100% ».* C'est le moment où le ROI devient tangible.

#### Plan Cible : **DIFFUSION** (5 000 FCFA/mois) ou **PREMIUM** (10 000 FCFA/mois)

---

### Persona C — L'Agence de Services / Community Manager (« Awa l'Agence »)

**Profil :** Femme ou homme, 22-35 ans, gère le marketing digital de 3 à 10 clients (restaurants, hôtels, cliniques, écoles). Basée à Ouagadougou, Dakar ou Abidjan. Revenu : 150k-1M FCFA/mois par client.

**Comportement digital :** Gère plusieurs numéros WhatsApp Business pour ses clients. Utilise Canva pour les visuels. Cherche constamment à automatiser pour prendre plus de clients sans recruter.

#### Pain Points (Douleurs)

- **Gestion manuelle multi-comptes** — Elle jongle entre 5 téléphones ou 5 sessions WhatsApp Web. Chaque client nécessite une attention dédiée.
- **Incapacité à scaler** — Elle ne peut pas prendre un 6ème client car elle n'a plus de temps pour répondre aux messages entrants de chacun.
- **Valeur perçue faible** — Ses clients ne voient pas la valeur de ses services car elle ne peut pas montrer de résultats quantifiés (nombre de messages traités, campagnes envoyées).
- **Risque de burnout** — Elle est la seule à tout faire, et le moindre retard de réponse impacte la satisfaction de ses clients.

#### Objections Principales

- *« J'ai besoin de personnaliser chaque bot pour chaque client »* → Réponse : Chaque instance a son propre `systemPrompt` (personnalité du bot) et sa propre base de connaissances (KnowledgeDocuments). Le bot d'un restaurant ne répondra jamais comme celui d'une clinique.
- *« Et la confidentialité des données de mes clients ? »* → Réponse : Chaque instance est isolée. Les documents et le prompt système sont liés à l'instance, pas au compte utilisateur. La blacklist permet d'exclure des numéros sensibles.
- *« C'est trop cher pour le revendre à mes clients »* → Réponse : L'abonnement Premium à 10 000 FCFA/mois inclut IA + Diffusion. Tu le revends 50 000 à 100 000 FCFA/mois à ton client comme un service « WhatsApp Automation ». Marge de 80-90%.

#### "Aha! Moment"

> **Le moment où elle met en place un bot pour un client restaurant qui gère automatiquement les réservations et les questions sur le menu à partir d'un simple PDF.** Son client lui dit : *« Depuis que tu as mis ça en place, je reçois des commandes même après la fermeture. »* C'est le moment où elle réalise qu'elle peut facturer ce service 10x le prix de l'abonnement.

#### Plan Cible : **PREMIUM** (10 000 FCFA/mois) × nombre de clients

---

## 3. Mapping Fonctionnalités → Bénéfices Marketing

> Chaque fonctionnalité technique ci-dessous est traduite en argument de vente concret.
> Les références entre parenthèses pointent vers les fichiers source qui implémentent la fonctionnalité.

### 3.1 Assistant IA Custom (Pipeline RAG)

| Fonctionnalité Technique | Bénéfice Marketing |
|---|---|
| **System Prompt personnalisable** par instance (`instance.systemPrompt`) | *« Donne une personnalité unique à ton assistant : formel pour une clinique, décontracté pour un restaurant. Ton bot parle comme toi. »* |
| **Base de connaissances par upload** (PDF jusqu'à 10 Mo + texte brut, vectorisé en chunks avec embeddings) | *« Upload ton catalogue PDF et ton bot connaît instantanément tous tes produits, prix et conditions. Pas besoin de programmer quoi que ce soit. »* |
| **Recherche sémantique** (similarité cosine, seuil 0.3, top 5 résultats) | *« Ton client peut poser sa question en langage naturel — "vous avez des robes rouges taille M ?" — et le bot trouve la bonne réponse même si la formulation exacte n'est pas dans ton catalogue. »* |
| **Anti-hallucination** (le bot dit « je ne sais pas » si aucun contexte pertinent n'est trouvé) | *« Ton bot ne ment jamais. S'il ne connaît pas la réponse, il dit honnêtement qu'il n'a pas l'information, au lieu d'inventer un prix ou une disponibilité. Zéro risque de fausse promesse client. »* |
| **Historique conversationnel** (6 derniers messages conservés en contexte) | *« Ton bot se souvient du fil de la conversation. Le client peut dire "et en bleu ?" sans répéter tout le contexte. »* |
| **Compteur de messages** (50 messages en trial, illimité en payant) | *« Teste gratuitement avec 50 messages pour voir la qualité des réponses, puis passe en illimité pour ne rater aucun client. »* |
| **Activation/désactivation du bot** en un clic (`isBotActive` toggle) | *« Reprends le contrôle quand tu veux. Mets le bot en pause d'un clic pour répondre personnellement à un client VIP, puis réactive-le. »* |

### 3.2 Diffusion WhatsApp avec Spintax

| Fonctionnalité Technique | Bénéfice Marketing |
|---|---|
| **Spintax** (`{option1\|option2\|option3}` → message unique par destinataire) | *« Envoie 1 000 messages promo sans risquer de faire bloquer ton numéro par WhatsApp. Chaque message est légèrement différent, comme si tu l'avais écrit à la main. »* |
| **Rate Limiter** (1 message / 5 secondes via BullMQ, concurrency 5) | *« Le système envoie tes messages à un rythme humain. WhatsApp ne détecte pas de comportement suspect. Ton numéro reste safe. »* |
| **Médias joints** (image, vidéo, document avec caption) | *« Envoie la photo de ton nouvel arrivage, la vidéo de ta promo, ou ton catalogue PDF directement dans la conversation WhatsApp de chaque client. »* |
| **Programmation de campagnes** (date/heure future, exécution automatique toutes les 30s) | *« Programme ta campagne à 8h du matin pour qu'elle parte automatiquement pendant que tu prépares ta boutique. »* |
| **Gestion complète** (pause, reprise, duplication, modification, suppression) | *« Duplique une campagne qui a bien marché, modifie le message, et relance-la. Pas besoin de tout refaire de zéro. »* |
| **Rapport de campagne** envoyé automatiquement sur WhatsApp | *« À la fin de chaque campagne, tu reçois un rapport sur WhatsApp : 500/500 envoyés, 100% de réussite. Tu sais exactement ce qui s'est passé. »* |
| **Limite trial** (10 destinataires max, 50 messages total en essai) | *« Teste la diffusion gratuitement avec 10 contacts pour voir la puissance de l'outil avant de t'abonner. »* |

### 3.3 Blacklist (Liste Noire)

| Fonctionnalité Technique | Bénéfice Marketing |
|---|---|
| **Blacklist par instance** (tableau de numéros stocké en base, dédupliqué et nettoyé) | *« Bloque les numéros indésirables : concurrents qui espionnent, ex-clients harceleurs, ou ton propre numéro perso. Le bot les ignore complètement. »* |
| **Vérification en temps réel** (check avant chaque traitement de message entrant) | *« Un numéro blacklisté ne déclenche aucune réponse. Zéro consommation de messages, zéro interaction. C'est comme s'il n'existait pas. »* |
| **Gestion via API** (ajout/suppression dynamique) | *« Ajoute ou retire des numéros de ta liste noire à tout moment depuis ton tableau de bord, sans redémarrer le bot. »* |

### 3.4 Gestion Multi-Instances

| Fonctionnalité Technique | Bénéfice Marketing |
|---|---|
| **Une instance WhatsApp par utilisateur** (avec connexion via Pairing Code automatique) | *« Connecte ton numéro WhatsApp en 30 secondes : entre ton numéro, reçois un code à 8 chiffres, tape-le dans WhatsApp. C'est fait. Pas de QR code à scanner. »* |
| **Isolation complète** (chaque instance a son propre bot, sa propre base de connaissances, sa propre blacklist) | *« Chaque numéro connecté est totalement indépendant. Le bot, les documents, et les paramètres d'un numéro n'interfèrent jamais avec un autre. »* |
| **Notifications de connexion/déconnexion** automatiques sur WhatsApp | *« Si ton WhatsApp se déconnecte (changement de téléphone, batterie morte), tu reçois immédiatement une alerte. Tu ne découvres jamais 3 jours plus tard que ton bot était hors ligne. »* |
| **Synchronisation automatique** (cron job vérifie l'état des instances régulièrement) | *« Le système vérifie automatiquement que ta connexion est active. Pas besoin de surveiller manuellement. »* |

### 3.5 Système de Notifications WhatsApp

| Fonctionnalité Technique | Bénéfice Marketing |
|---|---|
| **OTP par WhatsApp** (pas par SMS ni email) | *« Pas besoin de retenir un mot de passe. Connecte-toi avec ton numéro WhatsApp et un code à usage unique. Simple, rapide, sécurisé. »* |
| **Message de bienvenue personnalisé** avec les 3 étapes de démarrage | *« Dès ton inscription, tu reçois un guide pas à pas directement sur WhatsApp. Pas besoin de chercher un email de confirmation dans tes spams. »* |
| **Alertes de quota** (80% et 100% consommés) | *« Tu es prévenu avant d'atteindre ta limite. Pas de mauvaise surprise. »* |
| **Rappels de renouvellement** (J-15, J-7, J-3, J-0) | *« On te rappelle gentiment avant l'expiration pour que ton bot ne s'arrête jamais. Tes clients continuent d'être servis sans interruption. »* |
| **Notification de suspension** avec rassurance (données conservées) | *« Même si ton abonnement expire, ta configuration, tes PDF et tes stats sont conservés. Tu réactives en 2 clics. »* |

### 3.6 Paiement Maketou (Mobile Money)

| Fonctionnalité Technique | Bénéfice Marketing |
|---|---|
| **Intégration Maketou API** (checkout automatique, webhook temps réel) | *« Paie avec Orange Money, Moov Money, ou tout autre mobile money. Le paiement est validé en temps réel, ton abonnement est activé instantanément. »* |
| **Activation automatique** post-paiement (webhook met à jour le statut en base + notification WhatsApp) | *« Dès que tu paies, ton bot se réactive automatiquement. Pas d'attente, pas de validation manuelle. »* |
| **Remise parrainage automatique** (10% de réduction, -1 000 FCFA, via un produit Maketou séparé) | *« Utilise un code parrain à l'inscription et économise 1 000 FCFA sur ton premier mois. Automatique, pas besoin de négocier. »* |

---

## 4. Le Moteur de Croissance (Affiliation & Pricing)

### 4.1 Architecture du Pricing — Analyse Psychologique

#### Les 3 Plans (données extraites du code source)

| Plan | Prix/mois | Bot IA | Diffusion | Base de Connaissances | Support |
|---|---|---|---|---|---|
| **DIFFUSION** | 5 000 FCFA (~7,60 €) | ❌ | ✅ Illimité | ❌ | Standard |
| **ASSISTANT** | 7 500 FCFA (~11,40 €) | ✅ Illimité | ❌ | ✅ | Standard |
| **PREMIUM** | 10 000 FCFA (~15,20 €) | ✅ Illimité | ✅ Illimité | ✅ | Prioritaire |

**Essai gratuit :** 3 jours, 50 messages IA, 10 destinataires par diffusion.

#### Pourquoi ce pricing fonctionne sur le marché cible

- **Ancrage psychologique à 5 000 FCFA** — C'est le prix d'un repas dans un maquis correct à Ouagadougou. Ce n'est pas un investissement effrayant. C'est un montant que même un micro-entrepreneur peut tester sans stress. Le plan Diffusion à ce prix sert de **porte d'entrée** dans l'écosystème NeoChat.

- **Segmentation fonctionnelle, pas volumétrique** — Les messages sont illimités sur tous les plans payants. La différence porte sur le **type de fonctionnalité** (IA vs Diffusion vs les deux). C'est un choix stratégique : pas de calcul mental complexe (« est-ce que 500 messages me suffiront ? »). L'utilisateur choisit son cas d'usage, pas un quota. Cela réduit le friction à l'achat.

- **Le Premium comme évidence** — À 10 000 FCFA, le plan Premium coûte seulement 2 500 FCFA de plus que l'Assistant (et 5 000 de plus que la Diffusion), mais donne accès à **toutes** les fonctionnalités. Le rapport perçu prix/valeur est massivement en faveur du Premium. C'est le **plan anchor** qui pousse les hésitants à upgrader. Psychologie classique du « decoy effect » : le plan du milieu rend le plan supérieur irrésistible.

- **Compatibilité mobile money** — Pas de carte bancaire, pas de PayPal, pas de Stripe. Maketou = Orange Money, Moov Money, les moyens de paiement que la cible utilise **quotidiennement**. Zero friction de paiement. Le checkout génère un lien, l'utilisateur paie sur son téléphone, le webhook active l'abonnement en temps réel.

- **Cycle mensuel de 30 jours** — Pas d'engagement annuel. Le code calcule `nextBillingDate = now + 30 jours`. Cela correspond au cycle de revenus de la cible (commerçants qui pensent en mois, pas en année). Faible engagement perçu = meilleur taux de conversion initial.

#### Matrice de décision pour le copywriting

| Si le prospect dit... | Recommander... | Argument clé |
|---|---|---|
| « Je veux juste envoyer des promos » | DIFFUSION (5 000) | « Tu envoies tes promos, tu reçois le rapport. Point. » |
| « Je veux un bot qui répond à mes clients » | ASSISTANT (7 500) | « Upload ton catalogue, active le bot, va dormir. » |
| « Je veux les deux » | PREMIUM (10 000) | « Pour 2 500 FCFA de plus, tu as tout. C'est le prix d'un café par jour. » |
| « C'est trop cher » | DIFFUSION (5 000) + affiliation | « Parraine 2 personnes et ton abonnement se paie tout seul. » |

---

### 4.2 Mécanique d'Affiliation — Le Viral Loop

#### Fonctionnement technique (extrait du code)

```
Inscription avec code parrain (referredBy) 
    → Stocké en base sur le profil utilisateur (user.referredBy)
    → Au moment du checkout : produit Maketou avec -10% (productDocumentIdWithDiscount)
    → Le filleul paie 10% de moins (ex: 9 000 au lieu de 10 000)
    → Au webhook de paiement réussi : 
        → Commission de 20% du montant payé créditée au parrain (walletBalance)
        → AffiliatePayment créé avec statut COMPLETED
        → Le parrain voit ses gains dans son dashboard (affiliate-stats)
```

#### Les 3 incitations qui font tourner la boucle

| Acteur | Incitation | Montant concret |
|---|---|---|
| **Le filleul** | -10% sur le premier mois | Économie de 500 à 1 000 FCFA |
| **Le parrain** | +20% de commission sur chaque paiement de son filleul | 1 000 à 2 000 FCFA par filleul/mois |
| **NeoChat** | Acquisition à coût 0 (le parrain fait le travail commercial) | CAC = 0 FCFA |

#### Simulation financière pour un affilié motivé

| Nombre de filleuls actifs | Commission mensuelle (plan moyen 7 500 FCFA) | Équivalent |
|---|---|---|
| 1 filleul | 1 500 FCFA | Couvre 30% de son propre abonnement Diffusion |
| 3 filleuls | 4 500 FCFA | Son abonnement Diffusion est gratuit + 500 FCFA de bonus |
| 5 filleuls | 7 500 FCFA | Son abonnement Premium est gratuit |
| 10 filleuls | 15 000 FCFA | Il gagne de l'argent net chaque mois |
| 50 filleuls | 75 000 FCFA | Revenu secondaire significatif |

#### Stratégie : L'affiliation comme canal d'acquisition N°1

L'affiliation n'est **pas** une option secondaire. C'est le **moteur principal de croissance** de NeoChat. Voici pourquoi et comment l'exploiter :

**1. Transformer chaque utilisateur en commercial**

- Chaque utilisateur reçoit un `referralCode` unique à l'inscription (généré automatiquement).
- Le code est personnalisable (4-20 caractères alphanumériques, via `PATCH /user/referral-code`). L'utilisateur peut le rendre mémorable (ex: `FATOU2024`, `IBRAHIM`).
- Le dashboard affiche les stats en temps réel : nombre de filleuls, gains du mois, gains totaux, historique des paiements.

**2. La boucle virale naturelle**

```
Utilisateur satisfait 
  → Partage son code parrain (WhatsApp status, bouche-à-oreille)
  → Nouveau prospect s'inscrit avec le code (champ referredBy à l'inscription)
  → Prospect teste en trial (3 jours, 50 messages)
  → Prospect paie → parrain touche 20%
  → Nouveau payant devient parrain à son tour
  → Boucle virale auto-entretenue
```

**3. Le « Viral Loop » WhatsApp-natif**

L'avantage massif de NeoChat sur ce marché : **l'outil tourne sur WhatsApp et l'acquisition se fait sur WhatsApp**. Le canal de distribution EST le canal d'utilisation. Quand un utilisateur NeoChat envoie une campagne de 500 messages, chaque destinataire voit que le message vient d'un numéro WhatsApp « intelligent ». La curiosité fait le reste :
- *« C'est quoi ce truc qui répond tout seul ? »*
- *« Comment tu fais pour envoyer des promos comme ça ? »*

Chaque interaction du bot est une démonstration produit gratuite.

**4. Stratégie de retrait des gains**

Les gains d'affiliation sont stockés dans `walletBalance`. L'utilisateur configure ses infos de paiement (nom, téléphone, méthode : Orange Money, Moov Money, etc.) et peut demander un retrait via `AffiliatePayment`. Ce flux transforme l'affiliation en **vrai revenu mobile money**, pas en crédits virtuels.

**5. Arguments de recrutement d'affiliés**

| Cible Affilié | Pitch |
|---|---|
| Utilisateur NeoChat existant | *« Tu utilises déjà NeoChat. Partage ton code et gagne 20% sur chaque personne que tu ramènes. 5 filleuls = ton abonnement gratuit. »* |
| Community Manager | *« Tu gères déjà les WhatsApp de tes clients. Inscris-les sur NeoChat avec ton code et touche une commission récurrente chaque mois en plus de tes honoraires. »* |
| Influenceur local / créateur de contenu | *« Fais une vidéo "Comment j'ai automatisé mon WhatsApp" et mets ton code parrain en description. Chaque inscription = argent sur ton Orange Money. »* |
| Formateur / coach business | *« Intègre NeoChat dans tes formations e-commerce. Tes élèves s'inscrivent avec ton code, tu touches 20% à vie. »* |

---

## 5. Contexte du Marché — L'Océan Bleu

### 5.1 L'opportunité WhatsApp en Afrique de l'Ouest

#### Données structurantes

- **WhatsApp est l'application N°1** en Afrique subsaharienne avec un taux de pénétration massif parmi les utilisateurs de smartphones. Au Burkina Faso, en Côte d'Ivoire, au Mali et au Sénégal, WhatsApp n'est pas une « app de messaging » — c'est **l'infrastructure commerciale de facto**. Les commerçants prennent les commandes par WhatsApp, envoient les photos de produits par WhatsApp, et négocient les prix par WhatsApp.

- **Le commerce informel domine** — Plus de 80% de l'activité économique en Afrique de l'Ouest est informelle. Ces micro-entrepreneurs n'utilisent pas de CRM, pas de Shopify, pas de Mailchimp. Leur seul outil digital est WhatsApp. Tout outil SaaS qui veut les atteindre doit **vivre dans WhatsApp**, pas à côté.

- **Le smartphone comme unique device** — La majorité des commerçants cibles n'ont pas d'ordinateur. Tout se fait sur mobile. NeoChat est conçu comme une PWA mobile-first avec authentification par OTP WhatsApp (pas d'email requis). C'est un choix d'architecture qui reflète la réalité terrain.

#### Pourquoi maintenant ?

- **Explosion du mobile money** — Le mobile money est devenu le moyen de paiement dominant en Afrique de l'Ouest (Orange Money, Moov Money, Wave). L'intégration de Maketou permet à NeoChat de monétiser directement sur ce rail de paiement. Il y a 3 ans, collecter un paiement récurrent de 5 000 FCFA auprès d'un commerçant burkinabè était un cauchemar logistique. Aujourd'hui, c'est un lien Maketou et un USSD.

- **Démocratisation de l'IA** — Les API d'IA (OpenRouter, GPT-4o-mini) sont désormais accessibles à un coût suffisamment bas pour être intégrées dans un SaaS à 7 500 FCFA/mois. Le coût d'un appel RAG (embedding + completion) est de l'ordre de 0,001-0,01$ — négligeable même avec des centaines de messages par jour.

- **WhatsApp Business API encore inaccessible** — L'API officielle WhatsApp Business (via Meta) nécessite une validation complexe, des coûts par conversation, et un niveau technique élevé. NeoChat, via Evolution API (open-source), offre les mêmes capacités sans ces barrières. C'est une fenêtre d'opportunité tant que Meta n'a pas simplifié son offre pour les TPE africaines.

### 5.2 L'Océan Bleu — Absence de concurrence locale adaptée

#### Analyse concurrentielle

| Concurrent potentiel | Limitation principale pour le marché cible |
|---|---|
| **ManyChat / Chatfuel** | Conçu pour Facebook Messenger et Instagram. Pas de WhatsApp natif abordable. Paiement en USD par carte bancaire. Interface en anglais. |
| **WATI / Twilio** | API WhatsApp Business officielle. Coût par conversation ($0.05-0.15/msg). Validation Meta obligatoire. Trop cher et trop complexe pour un commerçant à Bobo-Dioulasso. |
| **Brevo (ex-Sendinblue)** | Orienté email marketing. WhatsApp est un add-on, pas le cœur du produit. Pricing en EUR. |
| **Solutions locales** | Quasi inexistantes. Les quelques solutions qui existent sont des agences qui font du service (pas du SaaS self-service). |

#### Ce que NeoChat fait différemment

| Dimension | Approche classique (concurrents) | Approche NeoChat |
|---|---|---|
| **Paiement** | Carte bancaire, USD/EUR | Mobile money (Maketou), FCFA |
| **Authentification** | Email + mot de passe | OTP WhatsApp (zéro email) |
| **Onboarding** | Formulaire web + docs techniques | Message de bienvenue WhatsApp avec 3 étapes |
| **Connexion WhatsApp** | API officielle Meta (validation longue) | Evolution API + Pairing Code (30 secondes) |
| **Pricing** | 20-100$/mois | 5 000-10 000 FCFA/mois (7-15€) |
| **Base de connaissances** | Configuration technique (JSON, API) | Upload PDF + texte brut |
| **Acquisition** | Ads Facebook/Google en anglais | Affiliation WhatsApp-native (bouche-à-oreille digital) |
| **Langue** | Anglais | Français (langue commerciale d'Afrique de l'Ouest) |
| **Support** | Ticketing email | WhatsApp direct (le même canal que le produit) |

### 5.3 Barrières à l'entrée que NeoChat construit

- **Effet réseau via l'affiliation** — Chaque nouvel utilisateur est un canal d'acquisition potentiel. Plus le réseau grandit, plus le coût d'acquisition tend vers zéro. Un concurrent qui arrive après doit reconstruire ce réseau de zéro.

- **Base de connaissances comme switching cost** — Une fois que le commerçant a uploadé son catalogue, ses FAQ, ses conditions de livraison en PDF, il a investi du temps dans la configuration. Migrer vers un autre outil signifie refaire tout ce travail. C'est un lock-in naturel et non-abusif.

- **Habitude WhatsApp** — Les notifications NeoChat (OTP, alertes, rapports) arrivent sur WhatsApp. L'utilisateur interagit avec le produit **sans jamais ouvrir un navigateur**. Cette habitude est extrêmement difficile à briser pour un concurrent.

- **Connaissance du terrain** — L'architecture technique reflète des choix impossibles à faire sans comprendre le marché : pays par défaut `bf` (Burkina Faso), pricing en FCFA, cycle mensuel, pas d'email requis, mobile money natif. Un concurrent occidental devrait faire un pivot culturel complet.

### 5.4 TAM / SAM / SOM estimé (Afrique de l'Ouest francophone)

| Métrique | Estimation | Raisonnement |
|---|---|---|
| **TAM** (Total Addressable Market) | ~5M de commerçants utilisant WhatsApp pour le business dans la zone UEMOA | Commerçants informels + PME + indépendants |
| **SAM** (Serviceable Addressable Market) | ~500k commerçants avec smartphone Android récent + mobile money actif | Segment digitalisé minimum |
| **SOM** (Serviceable Obtainable Market — 24 mois) | 5 000 - 10 000 utilisateurs payants | Objectif réaliste via affiliation organique |
| **Revenu potentiel SOM** | 37,5M - 75M FCFA/mois (57k - 114k €/mois) | Basé sur ARPU moyen de 7 500 FCFA |

---

## Annexe — Glossaire Technique → Marketing

| Terme technique (code) | Traduction marketing (pour le copywriting) |
|---|---|
| `Pipeline RAG` | « Intelligence artificielle qui lit tes documents et répond à tes clients » |
| `Spintax` | « Messages personnalisés automatiquement pour éviter les blocages WhatsApp » |
| `KnowledgeDocument` | « Document de ta base de connaissances (PDF ou texte) » |
| `systemPrompt` | « La personnalité de ton assistant (comment il doit parler) » |
| `blacklist` | « Liste noire des numéros que ton bot doit ignorer » |
| `walletBalance` | « Ton portefeuille d'affiliation (tes gains accumulés) » |
| `referralCode` | « Ton code parrain personnel » |
| `Maketou` | « Paiement mobile money sécurisé » |
| `Evolution API` | « Connexion WhatsApp professionnelle » |
| `BullMQ / Rate Limiter` | « Système d'envoi intelligent qui protège ton numéro » |
| `TRIAL` | « Période d'essai gratuite (3 jours, 50 messages) » |
| `EXPIRED` | « Abonnement expiré (données conservées, bot en pause) » |
| `isBotActive` | « Bouton ON/OFF de ton assistant IA » |
| `Pairing Code` | « Code de jumelage à 8 chiffres pour connecter ton WhatsApp » |

---

> **Ce document est la source de vérité unique** pour toute communication marketing, tout script de vente, tout contenu d'acquisition et toute stratégie de croissance de NeoChat. Aucune fonctionnalité mentionnée ici n'est inventée — chaque élément est issu directement du code source en production.
