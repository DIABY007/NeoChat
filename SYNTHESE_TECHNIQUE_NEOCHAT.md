# État des Lieux Technique NeoChat - Juin 2026

Ce document recense l'intégralité des fonctionnalités implémentées dans le code source de NeoChat (Backend & Frontend), leurs capacités réelles, leurs limites techniques et leur niveau de stabilité.

---

### 1. Authentification & Sécurité Utilisateur
*   **Fonctionnalité** : Système d'authentification par numéro de téléphone avec vérification OTP.
*   **Action Technique** : Envoi d'un code à 6 chiffres via l'instance WhatsApp `NeoChat_System`. Hashage des mots de passe (bcrypt) et gestion des sessions via JWT.
*   **Limites Actuelles** : Dépendance totale à la disponibilité de l'instance système WhatsApp pour la réception du code. Pas de fallback SMS (choix architectural).
*   **Stabilité** : **Stable**.

### 2. Gestion des Instances WhatsApp (Multi-device)
*   **Fonctionnalité** : Connexion de comptes WhatsApp via Evolution API.
*   **Action Technique** : Génération de QR Code ou de Pairing Code (code à 8 chiffres). Monitoring de l'état de connexion (`CONNECTED`, `CONNECTING`, `DISCONNECTED`).
*   **Limites Actuelles** : Une seule instance active autorisée par utilisateur (contrainte de base de données). Déconnexions intermittentes si le téléphone perd le réseau de manière prolongée.
*   **Stabilité** : **Stable** (Améliorée par le récent correctif de déduplication des notifications).

### 3. Base de Connaissances (RAG - Retrieval-Augmented Generation)
*   **Fonctionnalité** : Entraînement de l'IA sur des documents personnalisés.
*   **Action Technique** : Upload de fichiers PDF et TXT. Vectorisation des données et stockage pour recherche contextuelle lors des interactions.
*   **Limites Actuelles** : Support limité aux formats .pdf et .txt. Taille maximale des fichiers fixée à 50 Mo par upload. Pas d'import direct via URL de site web pour le moment.
*   **Stabilité** : **Stable**.

### 4. Agent IA Conversationnel
*   **Fonctionnalité** : Réponse automatique intelligente aux messages entrants.
*   **Action Technique** : Intégration avec l'API Dify/OpenAI. Utilisation du `System Prompt` (personnalité) et de la Base de Connaissances. Déclenchement par mot-clé (optionnel).
*   **Limites Actuelles** : Latence de réponse (3 à 7 secondes selon la charge des API LLM). Risque de "hallucination" si la base de connaissances est contradictoire ou insuffisante.
*   **Stabilité** : **Stable**.

### 5. Campagnes de Diffusion (Broadcast)
*   **Fonctionnalité** : Envoi groupé de messages à une liste de contacts.
*   **Action Technique** : Système de file d'attente (BullMQ/Redis) avec gestion de délais aléatoires entre les messages pour éviter le bannissement. Programmation à une date/heure précise.
*   **Limites Actuelles** : Pas de prévisualisation en temps réel du message avec les variables. Limite de 500 contacts par campagne pour garantir la délivrabilité.
*   **Stabilité** : **Stable**.

### 6. Gestion des Contacts & Groupes
*   **Fonctionnalité** : Centralisation des listes de diffusion et interaction dans les groupes.
*   **Action Technique** : Import de contacts via CSV. Le bot peut écouter et répondre dans les groupes WhatsApp s'il y est ajouté.
*   **Limites Actuelles** : Pas de segmentation avancée (tags complexes). Les interactions en groupe sont limitées à la réponse simple (pas de modération type kick/ban).
*   **Stabilité** : **Stable**.

### 7. Système de Paiement & Abonnements
*   **Fonctionnalité** : Gestion des plans FREE, ASSISTANT, et PRO.
*   **Action Technique** : Intégration avec Maketou/Stripe. Activation automatique des fonctionnalités après validation du webhook de paiement. Relances automatiques de renouvellement à J-15, J-7, J-3.
*   **Limites Actuelles** : Un seul mode de paiement actif (Afrique de l'Ouest / Maketou privilégié). Pas de gestion de prorata en cas de changement de plan en milieu de mois.
*   **Stabilité** : **Stable**.

### 8. Notifications Système Automatisées
*   **Fonctionnalité** : Alertes de maintenance et de statut envoyées par WhatsApp.
*   **Action Technique** : Notification automatique à l'utilisateur en cas de déconnexion de son instance, succès de paiement, échec de prélèvement, ou épuisement de quota.
*   **Limites Actuelles** : Si l'instance `NeoChat_System` est déconnectée, aucune notification de secours n'est envoyée.
*   **Stabilité** : **Stable**.

### 9. Dashboard Administration
*   **Fonctionnalité** : Supervision globale de la plateforme pour l'équipe NeoChat.
*   **Action Technique** : Visualisation de tous les utilisateurs, statut des abonnements, gestion manuelle des instances et statistiques d'utilisation globales.
*   **Limites Actuelles** : Interface rudimentaire comparée au dashboard client. Pas d'outils de debug direct des conversations IA depuis l'admin.
*   **Stabilité** : **Stable**.

### 10. Synchronisation & Restauration Automatique
*   **Fonctionnalité** : Maintien de la persistance des sessions après redémarrage serveur.
*   **Action Technique** : Script `instanceRestoreService` qui vérifie et reconnecte les instances actives au démarrage du backend. Synchronisation périodique toutes les 5 minutes.
*   **Limites Actuelles** : Si Evolution API tombe, le service de restauration tourne dans le vide jusqu'au rétablissement de l'API tiers.
*   **Stabilité** : **Stable**.

---
*Fin du rapport technique - Version 1.0.0*
