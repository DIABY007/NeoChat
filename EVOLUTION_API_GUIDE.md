# Guide Complet : Evolution API pour NeoChat

> **Objectif** : Remplacer tout fournisseur WhatsApp externe par Evolution API (auto-hébergé, gratuit, basé sur Baileys) pour envoyer/recevoir des messages WhatsApp directement depuis NeoChat, en utilisant la base PostgreSQL Supabase existante.

---

## Table des matières

1. [Qu'est-ce qu'Evolution API ?](#1-quest-ce-quevolution-api)
2. [Architecture cible NeoChat + Evolution API](#2-architecture-cible-neochat--evolution-api)
3. [Prérequis](#3-prérequis)
4. [Installation via Docker (Recommandé)](#4-installation-via-docker-recommandé)
5. [Installation manuelle (sans Docker)](#5-installation-manuelle-sans-docker)
6. [Configuration complète des variables d'environnement](#6-configuration-complète-des-variables-denvironnement)
7. [Intégration avec Supabase (PostgreSQL)](#7-intégration-avec-supabase-postgresql)
8. [Gestion des instances WhatsApp](#8-gestion-des-instances-whatsapp)
9. [Envoi de messages (tous types)](#9-envoi-de-messages-tous-types)
10. [Système de Webhooks](#10-système-de-webhooks)
11. [Intégration concrète dans NeoChat Backend](#11-intégration-concrète-dans-neochat-backend)
12. [Campagnes de diffusion (Broadcast)](#12-campagnes-de-diffusion-broadcast)
13. [Gestion des contacts et groupes](#13-gestion-des-contacts-et-groupes)
14. [Sécurité et bonnes pratiques en production](#14-sécurité-et-bonnes-pratiques-en-production)
15. [Monitoring et logs](#15-monitoring-et-logs)
16. [Troubleshooting (Problèmes fréquents)](#16-troubleshooting-problèmes-fréquents)
17. [Migration depuis un fournisseur externe](#17-migration-depuis-un-fournisseur-externe)
18. [Résumé des endpoints API](#18-résumé-des-endpoints-api)

---

## 1. Qu'est-ce qu'Evolution API ?

**Evolution API** est une plateforme open-source (licence Apache 2.0) qui fournit une API REST complète pour WhatsApp. Elle est construite sur la bibliothèque **Baileys** (connexion WhatsApp Web non-officielle) et permet :

- **Envoi/réception** de messages texte, médias, documents, localisation, contacts
- **Gestion d'instances** WhatsApp multiples (chaque utilisateur NeoChat a sa propre instance)
- **Connexion par QR Code ou Pairing Code** (code à 8 caractères)
- **Webhooks en temps réel** pour recevoir les messages entrants
- **Gestion des groupes** et contacts
- **Zéro coût par message** — pas de frais par conversation comme l'API officielle WhatsApp Business

### Pourquoi Evolution API plutôt qu'un fournisseur externe ?

| Critère | Fournisseur externe | Evolution API |
|---------|-------------------|---------------|
| Coût par message | Payant (0.05-0.10€/msg) | **Gratuit** |
| Hébergement | Cloud du fournisseur | **Auto-hébergé (vous contrôlez)** |
| Limites d'envoi | Quotas imposés | **Pas de limite imposée par l'API** |
| Latence | Variable | **Très faible (auto-hébergé)** |
| QR Code / Pairing | Souvent limité | **Support complet** |
| Webhooks | Configuration limitée | **Entièrement configurable** |
| Dépendance | Forte | **Aucune** |

> ⚠️ **Note légale** : Evolution API utilise le protocole WhatsApp Web via Baileys (non officiel). WhatsApp peut théoriquement bloquer un numéro qui abuse du système. Respectez les bonnes pratiques (pas de spam, délais entre messages).

---

## 2. Architecture cible NeoChat + Evolution API

```
┌─────────────────────────────────────────────────────────┐
│                    SERVEUR (VPS/Cloud)                   │
│                                                         │
│  ┌──────────────┐     ┌──────────────────┐              │
│  │  NeoChat     │────▶│  Evolution API   │◀──── WhatsApp│
│  │  Backend     │◀────│  (port 8080)     │────▶ Servers │
│  │  (port 3001) │     └──────────────────┘              │
│  └──────┬───────┘              │                        │
│         │                      │                        │
│  ┌──────▼───────┐     ┌───────▼──────────┐              │
│  │  Redis       │     │  PostgreSQL      │              │
│  │  (port 6379) │     │  (Supabase)      │              │
│  │  Queue msgs  │     │  Données NeoChat │              │
│  └──────────────┘     │  + Evolution     │              │
│                       └──────────────────┘              │
│  ┌──────────────┐                                       │
│  │  NeoChat     │                                       │
│  │  Frontend    │                                       │
│  │  (port 3000) │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

**Flux des messages :**
1. **Message entrant** : WhatsApp → Evolution API → Webhook → NeoChat Backend → RAG/AI → Queue → Evolution API → WhatsApp (réponse)
2. **Message sortant (notification)** : NeoChat Backend → Evolution API → WhatsApp
3. **Campagne** : NeoChat Backend → Queue → Evolution API → WhatsApp (bulk)

---

## 3. Prérequis

### Matériel minimum (VPS)
- **CPU** : 2 vCPU
- **RAM** : 4 Go minimum (8 Go recommandé si plusieurs instances)
- **Stockage** : 20 Go SSD
- **OS** : Ubuntu 20.04+ / Debian 11+

### Logiciels requis
```bash
# Node.js 20+ (si installation manuelle)
node --version  # v20.0.0 ou supérieur

# Docker + Docker Compose (si installation Docker)
docker --version        # 24.0+
docker compose version  # v2.20+

# PostgreSQL (via Supabase — déjà en place dans NeoChat)
# Redis (déjà utilisé par NeoChat pour les queues de messages)
```

### Ports à ouvrir
| Port | Service | Usage |
|------|---------|-------|
| 8080 | Evolution API | API REST WhatsApp |
| 3001 | NeoChat Backend | Serveur Express |
| 3000 | NeoChat Frontend | Interface Next.js |
| 6379 | Redis | Cache + Queues |
| 5432 | PostgreSQL | Base de données (Supabase) |

---

## 4. Installation via Docker (Recommandé)

### 4.1 Créer le fichier Docker Compose

Créer un fichier `docker-compose.yml` à la racine du projet ou sur le serveur :

```yaml
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution-api
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      # === SERVEUR ===
      - SERVER_TYPE=http
      - SERVER_PORT=8080
      - SERVER_URL=https://votre-domaine-evolution.com
      # Remplacer par votre URL publique (obligatoire pour les webhooks)
      # En dev local: http://localhost:8080

      # === AUTHENTIFICATION ===
      - AUTHENTICATION_API_KEY=VOTRE_CLE_API_SECRETE_ICI
      # Générer une clé forte: openssl rand -hex 32
      - AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

      # === BASE DE DONNÉES (Supabase PostgreSQL) ===
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://postgres.[PROJECT-REF]:VOTRE_MOT_DE_PASSE@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?schema=evolution
      # ⬆️ IMPORTANT: Utiliser le schema "evolution" pour séparer des données NeoChat
      - DATABASE_CONNECTION_CLIENT_NAME=evolution_api
      - DATABASE_SAVE_DATA_INSTANCE=true
      - DATABASE_SAVE_DATA_NEW_MESSAGE=true
      - DATABASE_SAVE_MESSAGE_UPDATE=true
      - DATABASE_SAVE_DATA_CONTACTS=true
      - DATABASE_SAVE_DATA_CHATS=true
      - DATABASE_SAVE_DATA_LABELS=true

      # === REDIS CACHE ===
      - CACHE_REDIS_ENABLED=true
      - CACHE_REDIS_URI=redis://redis:6379/6
      - CACHE_REDIS_PREFIX_KEY=evolution
      - CACHE_REDIS_SAVE_INSTANCES=true

      # === CONFIGURATION WHATSAPP ===
      - CONFIG_SESSION_PHONE_CLIENT=NeoChat
      - CONFIG_SESSION_PHONE_NAME=Chrome
      - QRCODE_LIMIT=30
      - QRCODE_COLOR=#175197

      # === WEBHOOK GLOBAL ===
      - WEBHOOK_GLOBAL_ENABLED=false
      # On préfère configurer les webhooks par instance via l'API
      
      # === CORS ===
      - CORS_ORIGIN=*
      - CORS_METHODS=GET,POST,PUT,DELETE
      - CORS_CREDENTIALS=true

      # === LOGS ===
      - LOG_LEVEL=INFO
      - LOG_COLOR=true
      - LOG_BAILEYS=error

      # === GESTION DES INSTANCES ===
      - DEL_INSTANCE=false
      # false = ne jamais supprimer automatiquement une instance déconnectée

      # === WEBSOCKET (optionnel, pour mise à jour temps réel du frontend) ===
      - WEBSOCKET_ENABLED=false

      # === LANGUE ===
      - LANGUAGE=fr
    volumes:
      - evolution_instances:/evolution/instances
    networks:
      - neochat-network
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    container_name: neochat-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - neochat-network

volumes:
  evolution_instances:
  redis_data:

networks:
  neochat-network:
    driver: bridge
```

### 4.2 Lancer les services

```bash
# Se placer dans le dossier contenant docker-compose.yml
cd /chemin/vers/le/projet

# Démarrer en arrière-plan
docker compose up -d

# Vérifier que tout tourne
docker compose ps

# Voir les logs en temps réel
docker compose logs -f evolution-api

# Vérifier que l'API répond
curl http://localhost:8080
# Réponse attendue : informations sur l'API
```

### 4.3 Mettre à jour Evolution API

```bash
# Arrêter les services
docker compose down

# Télécharger la dernière image
docker compose pull evolution-api

# Relancer
docker compose up -d

# Vérifier les logs après mise à jour
docker compose logs -f evolution-api
```

---

## 5. Installation manuelle (sans Docker)

### 5.1 Cloner et installer

```bash
# Cloner le repository
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Installer les dépendances
npm install

# Copier le fichier de configuration
cp .env.example .env

# Éditer la configuration (voir section 6)
nano .env

# Compiler le projet
npm run build

# Démarrer en mode production
npm run start:prod
```

### 5.2 Utiliser PM2 pour garder le service actif

```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer Evolution API avec PM2
pm2 start dist/src/main.js --name evolution-api

# Sauvegarder la configuration PM2
pm2 save

# Configurer le démarrage automatique au boot
pm2 startup

# Vérifier le statut
pm2 status

# Voir les logs
pm2 logs evolution-api

# Redémarrer après une mise à jour
pm2 restart evolution-api
```

### 5.3 Configurer Nginx comme reverse proxy

```nginx
# /etc/nginx/sites-available/evolution-api
server {
    listen 80;
    server_name evolution.votre-domaine.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts pour les longues connexions WebSocket
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/evolution-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Ajouter SSL avec Certbot
sudo certbot --nginx -d evolution.votre-domaine.com
```

---

## 6. Configuration complète des variables d'environnement

Voici **toutes** les variables d'environnement pertinentes pour Evolution API avec NeoChat :

### 6.1 Variables essentielles (OBLIGATOIRES)

```bash
# ===========================
# SERVEUR
# ===========================
SERVER_TYPE=http                          # http ou https
SERVER_PORT=8080                          # Port d'écoute
SERVER_URL=https://evolution.votre-domaine.com  # URL publique (CRITIQUE pour les webhooks)

# ===========================
# AUTHENTIFICATION (CRITIQUE)
# ===========================
AUTHENTICATION_API_KEY=VOTRE_CLE_SECRETE  # Clé API pour toutes les requêtes
# ⚠️ OBLIGATOIRE : Générer une clé forte avec : openssl rand -hex 32
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true  # Permettre de lister les instances

# ===========================
# BASE DE DONNÉES (Supabase PostgreSQL)
# ===========================
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?schema=evolution
# ATTENTION : Utiliser un schema séparé "evolution" pour ne pas polluer le schema "public" de NeoChat
# Le schema sera créé automatiquement au premier démarrage

DATABASE_CONNECTION_CLIENT_NAME=evolution_api

# Ce qu'on sauvegarde en base
DATABASE_SAVE_DATA_INSTANCE=true          # Sauvegarder les infos d'instance
DATABASE_SAVE_DATA_NEW_MESSAGE=true       # Sauvegarder les messages (utile pour historique)
DATABASE_SAVE_MESSAGE_UPDATE=true         # Sauvegarder les mises à jour de messages
DATABASE_SAVE_DATA_CONTACTS=true          # Sauvegarder les contacts
DATABASE_SAVE_DATA_CHATS=true             # Sauvegarder les chats
DATABASE_SAVE_DATA_LABELS=true            # Sauvegarder les labels
```

### 6.2 Variables recommandées

```bash
# ===========================
# REDIS CACHE
# ===========================
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://localhost:6379/6   # Utiliser la base 6 pour séparer de NeoChat
CACHE_REDIS_PREFIX_KEY=evolution            # Préfixe pour éviter les collisions
CACHE_REDIS_SAVE_INSTANCES=true            # Cache des instances en Redis

# ===========================
# CONFIGURATION WHATSAPP
# ===========================
CONFIG_SESSION_PHONE_CLIENT=NeoChat        # Nom affiché dans "Appareils connectés"
CONFIG_SESSION_PHONE_NAME=Chrome           # Type d'appareil simulé
QRCODE_LIMIT=30                            # Secondes avant régénération du QR code
QRCODE_COLOR=#175197                       # Couleur du QR code

# ===========================
# CORS
# ===========================
CORS_ORIGIN=*                              # En production, restreindre aux domaines NeoChat
# Exemple production : CORS_ORIGIN=https://neochat.pro,https://www.neochat.pro
CORS_METHODS=GET,POST,PUT,DELETE
CORS_CREDENTIALS=true

# ===========================
# LOGS
# ===========================
LOG_LEVEL=INFO                             # ERROR, WARN, DEBUG, INFO, LOG, VERBOSE
LOG_COLOR=true
LOG_BAILEYS=error                          # fatal, error, warn, info, debug, trace

# ===========================
# GESTION DES INSTANCES
# ===========================
DEL_INSTANCE=false                         # Ne JAMAIS supprimer automatiquement

# ===========================
# LANGUE
# ===========================
LANGUAGE=fr
```

### 6.3 Variables optionnelles (selon les besoins)

```bash
# ===========================
# WEBHOOK GLOBAL (optionnel — on préfère par instance)
# ===========================
WEBHOOK_GLOBAL_ENABLED=false
# Si true, TOUS les événements de TOUTES les instances vont à cette URL :
# WEBHOOK_GLOBAL_URL=https://votre-backend.com/api/webhook/evolution

# ===========================
# WEBSOCKET (optionnel — pour temps réel côté frontend)
# ===========================
WEBSOCKET_ENABLED=false
WEBSOCKET_GLOBAL_EVENTS=false

# ===========================
# STOCKAGE S3/MinIO (optionnel — pour stocker les médias)
# ===========================
# S3_ENABLED=true
# S3_ACCESS_KEY=votre-access-key
# S3_SECRET_KEY=votre-secret-key
# S3_BUCKET=neochat-media
# S3_ENDPOINT=s3.amazonaws.com
# S3_PORT=443
# S3_USE_SSL=true

# ===========================
# RABBITMQ (optionnel — pour queue de messages à haut volume)
# ===========================
# RABBITMQ_ENABLED=true
# RABBITMQ_URI=amqp://user:pass@localhost:5672
# RABBITMQ_EXCHANGE_NAME=evolution_exchange
```

### 6.4 Variables NeoChat Backend (.env)

Ajouter/vérifier ces variables dans le `.env` du backend NeoChat :

```bash
# Evolution API
EVOLUTION_API_URL=http://localhost:8080          # URL interne (même serveur)
# En production avec Docker : http://evolution-api:8080 (nom du container)
# En production avec Nginx : https://evolution.votre-domaine.com

EVOLUTION_API_KEY=VOTRE_CLE_SECRETE              # Même clé que AUTHENTICATION_API_KEY ci-dessus
EVOLUTION_SYSTEM_INSTANCE=NeoChat_System         # Instance dédiée aux notifications système (OTP, alertes)
BACKEND_WEBHOOK_URL=https://votre-backend.com/api/webhook/evolution
# ⬆️ URL publique du backend NeoChat pour recevoir les webhooks d'Evolution API
# En dev local avec ngrok : https://xxxx.ngrok.io/api/webhook/evolution
```

---

## 7. Intégration avec Supabase (PostgreSQL)

### 7.1 Pourquoi utiliser la même base Supabase ?

NeoChat utilise déjà Supabase (PostgreSQL) via Prisma. Evolution API peut utiliser la **même base de données** avec un **schema séparé** pour :

- **Simplifier l'infrastructure** : une seule base à gérer
- **Réduire les coûts** : pas de base supplémentaire
- **Faciliter les backups** : tout est au même endroit

### 7.2 Configuration de la connexion

**Récupérer l'URL de connexion Supabase :**

1. Aller sur [app.supabase.com](https://app.supabase.com)
2. Sélectionner votre projet
3. Aller dans **Settings** → **Database** → **Connection string**
4. Copier l'URL **Transaction mode** (port 6543) pour Evolution API
5. Format : `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

**Ajouter le paramètre schema :**

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?schema=evolution
```

> ⚠️ **CRITIQUE** : Le `?schema=evolution` est essentiel. Il sépare les tables d'Evolution API (dans le schema `evolution`) des tables NeoChat (dans le schema `public`). Sans ce paramètre, Evolution API créerait ses tables dans `public` et polluerait la base NeoChat.

### 7.3 Vérification après le premier démarrage

Après le premier lancement d'Evolution API, vérifier dans Supabase SQL Editor :

```sql
-- Lister les schemas
SELECT schema_name FROM information_schema.schemata;
-- Vous devriez voir : public, evolution, ...

-- Lister les tables du schema evolution
SELECT table_name FROM information_schema.tables WHERE table_schema = 'evolution';
-- Tables attendues : Instance, Message, Contact, Chat, etc.
```

### 7.4 NeoChat (Prisma) vs Evolution (schema séparé)

| Élément | NeoChat | Evolution API |
|---------|---------|---------------|
| Schema PostgreSQL | `public` | `evolution` |
| ORM | Prisma | TypeORM (interne à Evolution) |
| Tables | User, Instance, Subscription... | Instance, Message, Chat, Contact... |
| URL de connexion | `...?schema=public` | `...?schema=evolution` |

Le modèle Prisma `Instance` dans NeoChat reste votre **source de vérité** pour la relation utilisateur ↔ instance WhatsApp. Evolution API gère les données techniques (sessions Baileys, messages bruts).

---

## 8. Gestion des instances WhatsApp

### 8.1 Créer une instance

Chaque utilisateur NeoChat a besoin d'une **instance** Evolution API pour connecter son WhatsApp.

**Mode QR Code :**
```bash
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "user_123_whatsapp",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

**Mode Pairing Code (code à 8 caractères) :**
```bash
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "user_123_whatsapp",
    "qrcode": false,
    "number": "22670000000",
    "integration": "WHATSAPP-BAILEYS"
  }'
```

> ⚠️ **Règle critique pour le Pairing Code** : `qrcode` DOIT être `false` ET `number` DOIT être fourni (format international sans +, sans espaces). Si `qrcode: true` est envoyé avec un numéro, l'API retourne un QR code au lieu d'un pairing code.

**Réponse type :**
```json
{
  "instance": {
    "instanceName": "user_123_whatsapp",
    "instanceId": "uuid-xxx",
    "status": "created"
  },
  "hash": {
    "apikey": "instance-specific-key"
  },
  "qrcode": {
    "code": "2@...",
    "base64": "data:image/png;base64,..."
  }
}
```

### 8.2 Connecter une instance (obtenir le QR Code ou Pairing Code)

```bash
# QR Code : GET /instance/connect/{instanceName}
curl -X GET http://localhost:8080/instance/connect/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API"

# Pairing Code : GET /instance/connect/{instanceName}?number=22670000000
curl -X GET "http://localhost:8080/instance/connect/user_123_whatsapp?number=22670000000" \
  -H "apikey: VOTRE_CLE_API"
```

**Réponse Pairing Code :**
```json
{
  "pairingCode": "WZYEH1YY",
  "code": "2@...",
  "count": 1
}
```

L'utilisateur entre ce code dans WhatsApp → **Paramètres** → **Appareils connectés** → **Lier un appareil** → **Lier avec un numéro de téléphone**.

### 8.3 Vérifier le statut de connexion

```bash
curl -X GET http://localhost:8080/instance/connectionState/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API"
```

**Réponse :**
```json
{
  "instance": {
    "instanceName": "user_123_whatsapp",
    "state": "open"    // "open" = connecté, "close" = déconnecté, "connecting" = en cours
  }
}
```

### 8.4 Lister toutes les instances

```bash
curl -X GET http://localhost:8080/instance/fetchInstances \
  -H "apikey: VOTRE_CLE_API"
```

### 8.5 Redémarrer une instance

```bash
curl -X PUT http://localhost:8080/instance/restart/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API"
```

### 8.6 Déconnecter (logout) une instance

```bash
curl -X DELETE http://localhost:8080/instance/logout/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API"
```

### 8.7 Supprimer complètement une instance

```bash
curl -X DELETE http://localhost:8080/instance/delete/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API"
```

### 8.8 Gestion des conflits de nom d'instance

Si vous essayez de créer une instance avec un nom déjà existant, l'API retourne une erreur 403. La procédure de récupération :

1. **Logout** l'instance existante (ignore si erreur)
2. **Delete** l'instance existante
3. Attendre **2 secondes** (laisser le temps à Baileys de purger les fichiers de session)
4. **Recréer** l'instance

Ce pattern est déjà implémenté dans `evolutionInstanceService.ts` de NeoChat (voir `hardDeleteInstance`).

---

## 9. Envoi de messages (tous types)

### 9.1 Message texte

```bash
curl -X POST http://localhost:8080/message/sendText/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "22670000000",
    "text": "Bonjour ! Votre commande est prête 🎉"
  }'
```

**Format du numéro :** Code pays + numéro, sans +, sans espaces, sans tirets.
- ✅ `22670000000` (Burkina Faso)
- ✅ `33612345678` (France)
- ❌ `+226 56 63 60 39`
- ❌ `0656636039`

### 9.2 Message avec image

```bash
curl -X POST http://localhost:8080/message/sendMedia/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "22670000000",
    "mediatype": "image",
    "media": "https://exemple.com/image.jpg",
    "caption": "Voici votre produit"
  }'
```

> Le champ `media` accepte une **URL publique** ou une **chaîne base64**.

### 9.3 Message avec vidéo

```bash
curl -X POST http://localhost:8080/message/sendMedia/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "22670000000",
    "mediatype": "video",
    "media": "https://exemple.com/video.mp4",
    "caption": "Démonstration du produit"
  }'
```

### 9.4 Message audio (audio natif WhatsApp)

```bash
curl -X POST http://localhost:8080/message/sendWhatsAppAudio/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "22670000000",
    "audio": "https://exemple.com/audio.mp3"
  }'
```

### 9.5 Document (PDF, etc.)

```bash
curl -X POST http://localhost:8080/message/sendMedia/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "22670000000",
    "mediatype": "document",
    "media": "https://exemple.com/facture.pdf",
    "fileName": "facture_2024.pdf"
  }'
```

### 9.6 Localisation

```bash
curl -X POST http://localhost:8080/message/sendLocation/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "22670000000",
    "latitude": "12.3714",
    "longitude": "-1.5197",
    "name": "NeoChat Office",
    "address": "Ouagadougou, Burkina Faso"
  }'
```

### 9.7 Contact

```bash
curl -X POST http://localhost:8080/message/sendContact/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "22670000000",
    "contact": [{
      "fullName": "Support NeoChat",
      "wuid": "22670000000",
      "phoneNumber": "+226 56 63 60 39"
    }]
  }'
```

### 9.8 Liste interactive

```bash
curl -X POST http://localhost:8080/message/sendList/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "22670000000",
    "title": "Nos services",
    "description": "Choisissez un service :",
    "buttonText": "Voir les options",
    "footerText": "NeoChat",
    "sections": [{
      "title": "Services disponibles",
      "rows": [
        {"title": "📱 Abonnement", "description": "Gérer mon abonnement", "rowId": "sub"},
        {"title": "🤖 Bot IA", "description": "Configurer mon assistant", "rowId": "bot"},
        {"title": "📊 Statistiques", "description": "Voir mes stats", "rowId": "stats"}
      ]
    }]
  }'
```

### 9.9 Boutons (reply buttons)

```bash
curl -X POST http://localhost:8080/message/sendButtons/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "22670000000",
    "title": "Confirmer votre commande",
    "description": "Votre commande #1234 est prête",
    "buttons": [
      {"type": "replyButton", "displayText": "✅ Confirmer", "id": "confirm"},
      {"type": "replyButton", "displayText": "❌ Annuler", "id": "cancel"}
    ],
    "footerText": "NeoChat"
  }'
```

### 9.10 Implémentation TypeScript (Pattern NeoChat)

Voici comment implémenter l'envoi de messages dans le backend NeoChat :

```typescript
import axios from 'axios';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// Headers communs pour toutes les requêtes Evolution API
const evolutionHeaders = {
  'apikey': EVOLUTION_API_KEY,
  'Content-Type': 'application/json',
};

/**
 * Envoyer un message texte via Evolution API
 */
export async function sendTextMessage(
  instanceName: string,
  phone: string,
  text: string
): Promise<boolean> {
  try {
    await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
      { number: phone, text },
      { headers: evolutionHeaders }
    );
    return true;
  } catch (error: any) {
    console.error(`[Evolution] Erreur envoi texte:`, error.message);
    throw error;
  }
}

/**
 * Envoyer un média (image, vidéo, document)
 */
export async function sendMediaMessage(
  instanceName: string,
  phone: string,
  mediatype: 'image' | 'video' | 'document',
  mediaUrl: string,
  caption?: string,
  fileName?: string
): Promise<boolean> {
  try {
    const body: any = {
      number: phone,
      mediatype,
      media: mediaUrl,
    };
    if (caption) body.caption = caption;
    if (fileName) body.fileName = fileName;

    await axios.post(
      `${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`,
      body,
      { headers: evolutionHeaders }
    );
    return true;
  } catch (error: any) {
    console.error(`[Evolution] Erreur envoi média:`, error.message);
    throw error;
  }
}
```

---

## 10. Système de Webhooks

Les webhooks sont le mécanisme par lequel Evolution API **notifie NeoChat Backend** quand quelque chose se passe (nouveau message reçu, connexion/déconnexion, QR code mis à jour, etc.).

### 10.1 Configurer un webhook par instance

```bash
curl -X POST http://localhost:8080/webhook/set/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://votre-backend.com/api/webhook/evolution",
      "webhook_by_events": false,
      "webhook_base64": false,
      "events": [
        "QRCODE_UPDATED",
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "CONNECTION_UPDATE",
        "SEND_MESSAGE"
      ]
    }
  }'
```

### 10.2 Événements importants

| Événement | Déclencheur | Usage dans NeoChat |
|-----------|-------------|-------------------|
| `MESSAGES_UPSERT` | Nouveau message reçu | Déclencher le pipeline RAG/IA |
| `CONNECTION_UPDATE` | Connexion/déconnexion | Mettre à jour le statut de l'instance |
| `QRCODE_UPDATED` | Nouveau QR code/Pairing code | Afficher dans le frontend |
| `MESSAGES_UPDATE` | Message mis à jour (lu, supprimé) | Statistiques |
| `SEND_MESSAGE` | Message envoyé avec succès | Confirmer l'envoi |

### 10.3 Structure du payload webhook

**Message entrant (`messages.upsert`) :**
```json
{
  "event": "messages.upsert",
  "instance": "user_123_whatsapp",
  "data": {
    "key": {
      "remoteJid": "22670000000@s.whatsapp.net",
      "fromMe": false,
      "id": "BAE5F4XXXXXX"
    },
    "pushName": "Nom du contact",
    "message": {
      "conversation": "Bonjour, je veux commander"
    },
    "messageType": "conversation",
    "messageTimestamp": 1704067200
  },
  "date_time": "2024-01-01T12:00:00.000Z",
  "server_url": "https://evolution.votre-domaine.com",
  "apikey": "VOTRE_CLE_API"
}
```

**Connexion (`connection.update`) :**
```json
{
  "event": "connection.update",
  "instance": "user_123_whatsapp",
  "data": {
    "state": "open",
    "statusReason": 200
  }
}
```

**QR Code mis à jour (`qrcode.updated`) :**
```json
{
  "event": "qrcode.updated",
  "instance": "user_123_whatsapp",
  "data": {
    "qrcode": {
      "code": "2@XXXXX",
      "base64": "data:image/png;base64,..."
    },
    "pairingCode": "WZYEH1YY"
  }
}
```

### 10.4 Handler de webhook (Express/TypeScript — déjà implémenté dans NeoChat)

Le handler existe dans `src/routes/webhookRoutes.ts`. Voici la logique clé :

```typescript
router.post('/evolution', async (req: Request, res: Response) => {
  const payload = req.body;
  const event = payload.event;
  const instanceName = payload.instance;

  switch (event) {
    case 'connection.update':
      // État "open" → mettre Instance.status = "CONNECTED" en BDD
      // État "close" → mettre Instance.status = "DISCONNECTED" en BDD
      // Envoyer notification WhatsApp à l'utilisateur
      break;

    case 'qrcode.updated':
      // Stocker le pairing code en BDD pour que le frontend puisse l'afficher
      break;

    case 'messages.upsert':
      // Ignorer si fromMe = true (nos propres messages)
      // Ignorer si c'est un groupe (@g.us)
      // Extraire le texte du message
      // Lancer le pipeline RAG/IA
      // Envoyer la réponse via la queue de messages
      // Incrémenter le compteur de messages de l'abonnement
      break;
  }

  // TOUJOURS répondre 200 immédiatement
  res.status(200).json({ success: true });
});
```

> ⚠️ **Important** : Toujours répondre HTTP 200 rapidement au webhook. Si le traitement est long (IA, RAG), le faire de manière asynchrone ou via une queue (BullMQ/Redis comme NeoChat le fait déjà).

### 10.5 Webhook en développement local (ngrok)

En local, Evolution API ne peut pas envoyer les webhooks à `localhost`. Utiliser **ngrok** :

```bash
# Installer ngrok
npm install -g ngrok
# ou télécharger depuis https://ngrok.com

# Exposer le port du backend NeoChat
ngrok http 3001

# Copier l'URL HTTPS générée (ex: https://abc123.ngrok.io)
# Mettre à jour BACKEND_WEBHOOK_URL dans .env :
# BACKEND_WEBHOOK_URL=https://abc123.ngrok.io/api/webhook/evolution
```

---

## 11. Intégration concrète dans NeoChat Backend

### 11.1 Fichiers existants concernés

| Fichier | Rôle |
|---------|------|
| `src/services/evolutionInstanceService.ts` | CRUD instances, QR code, pairing code, webhook config |
| `src/services/evolutionService.ts` | Envoi d'OTP via WhatsApp |
| `src/services/systemMessagesService.ts` | Notifications système (OTP, paiement, alertes) |
| `src/routes/webhookRoutes.ts` | Handler des webhooks Evolution API |
| `src/queues/messageQueue.ts` | Queue Redis pour l'envoi de messages |

### 11.2 Instance système pour les notifications

NeoChat utilise une **instance système dédiée** (`EVOLUTION_SYSTEM_INSTANCE`) pour envoyer les notifications (OTP, alertes paiement, etc.). Cette instance :

- Est connectée au numéro WhatsApp de l'entreprise NeoChat
- Ne reçoit pas de messages IA (pas de bot)
- Sert uniquement à l'envoi de messages sortants

**Configuration :**
```bash
EVOLUTION_SYSTEM_INSTANCE=NeoChat_System
```

**Créer l'instance système au premier démarrage :**
```bash
# Créer l'instance
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "NeoChat_System",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'

# Récupérer le QR code et le scanner
curl -X GET http://localhost:8080/instance/connect/NeoChat_System \
  -H "apikey: VOTRE_CLE_API"

# Vérifier la connexion
curl -X GET http://localhost:8080/instance/connectionState/NeoChat_System \
  -H "apikey: VOTRE_CLE_API"
```

### 11.3 Flux complet : Inscription utilisateur

```
1. Utilisateur entre son numéro → Frontend
2. Frontend → POST /api/auth/request-otp → Backend
3. Backend génère OTP, le stocke en BDD
4. Backend → SystemMessagesService.sendOTP(phone, otpCode)
5. SystemMessagesService → POST /message/sendText/NeoChat_System → Evolution API
6. Evolution API → WhatsApp → Message OTP reçu par l'utilisateur
7. Utilisateur entre le code → Frontend
8. Frontend → POST /api/auth/verify-otp → Backend vérifie → JWT retourné
```

### 11.4 Flux complet : Bot IA répond à un client

```
1. Client envoie message WhatsApp au numéro de l'utilisateur NeoChat
2. WhatsApp → Evolution API (Baileys) → Webhook POST /api/webhook/evolution
3. webhookRoutes.ts reçoit l'événement "messages.upsert"
4. Vérifie : pas fromMe, pas un groupe, pas blacklisté
5. Vérifie : abonnement actif, bot actif, quota non atteint
6. Lance le pipeline RAG : processRAGQuery(userId, messageText, docs)
7. Ajoute la réponse IA à la queue Redis : messageQueue.add('send-message', {...})
8. Le worker de la queue envoie via : POST /message/sendText/{instanceName}
9. Evolution API → WhatsApp → Réponse reçue par le client
```

---

## 12. Campagnes de diffusion (Broadcast)

### 12.1 Envoi de masse avec délais

Pour éviter le ban WhatsApp, respecter des délais entre chaque message :

```typescript
async function sendBroadcast(
  instanceName: string,
  recipients: string[],
  message: string,
  mediaUrl?: string,
  mediaType?: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      if (mediaUrl && mediaType) {
        await sendMediaMessage(instanceName, recipient, mediaType, mediaUrl, message);
      } else {
        await sendTextMessage(instanceName, recipient, message);
      }
      sent++;
      
      // ⚠️ CRUCIAL : Délai entre chaque message (1-3 secondes)
      // Plus le nombre de destinataires est grand, plus le délai doit être long
      const delay = recipients.length > 100 ? 3000 : 1500;
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      failed++;
      console.error(`[Broadcast] Échec pour ${recipient}:`, error);
    }
  }

  return { sent, failed };
}
```

### 12.2 Bonnes pratiques anti-ban

- **Délai minimum** : 1-2 secondes entre chaque message
- **Limite quotidienne** : Ne pas dépasser 200-500 messages/jour par numéro
- **Contenu varié** : Éviter d'envoyer le même message identique à tous
- **Numéro "chaud"** : Utiliser un numéro WhatsApp qui a déjà une activité normale
- **Heures d'envoi** : Éviter les envois entre 22h et 7h
- **Opt-in** : N'envoyer qu'aux contacts qui ont accepté

---

## 13. Gestion des contacts et groupes

### 13.1 Récupérer les contacts

```bash
curl -X POST http://localhost:8080/chat/findContacts/user_123_whatsapp \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{"where": {}}'
```

**Filtrer les vrais contacts (pas les numéros non enregistrés) :**

```typescript
// Un contact est "réel" si :
// 1. remoteJid se termine par @s.whatsapp.net (pas un groupe)
// 2. isSaved === true (enregistré dans le répertoire du téléphone)
const realContacts = contacts.filter(c => 
  c.remoteJid?.endsWith('@s.whatsapp.net') && c.isSaved === true
);
```

### 13.2 Récupérer les groupes

```bash
curl -X GET "http://localhost:8080/group/fetchAllGroups/user_123_whatsapp?getParticipants=true" \
  -H "apikey: VOTRE_CLE_API"
```

### 13.3 Photo de profil

```bash
curl -X GET "http://localhost:8080/chat/profilePic/user_123_whatsapp?number=22670000000" \
  -H "apikey: VOTRE_CLE_API"
```

---

## 14. Sécurité et bonnes pratiques en production

### 14.1 Clé API forte

```bash
# Générer une clé API sécurisée
openssl rand -hex 32
# Résultat : a1b2c3d4e5f6... (64 caractères hexadécimaux)
```

### 14.2 Restreindre l'accès réseau

```bash
# Si Evolution API et NeoChat sont sur le même serveur :
# Ne PAS exposer le port 8080 publiquement
# Utiliser uniquement localhost ou le réseau Docker interne

# Docker Compose : retirer le port mapping public
# ports:
#   - "8080:8080"    # ❌ Accessible depuis Internet
# Remplacer par :
# ports:
#   - "127.0.0.1:8080:8080"  # ✅ Accessible uniquement en local
```

### 14.3 Variables d'environnement production

```bash
# CORS restreint
CORS_ORIGIN=https://neochat.pro,https://www.neochat.pro

# Logs réduits
LOG_LEVEL=WARN
LOG_BAILEYS=error

# URL serveur correcte (pour les webhooks)
SERVER_URL=https://evolution.neochat.pro
```

### 14.4 HTTPS obligatoire en production

Toujours utiliser HTTPS pour :
- Les webhooks (Evolution API → NeoChat Backend)
- L'accès à l'API Evolution (NeoChat Backend → Evolution API si exposé)
- Le dashboard (si utilisé)

### 14.5 Backups

```bash
# Backup de la base PostgreSQL (schéma evolution)
pg_dump -h HOST -U USER -d postgres --schema=evolution > evolution_backup_$(date +%Y%m%d).sql

# Backup des sessions Baileys (Docker)
docker cp evolution-api:/evolution/instances ./instances_backup_$(date +%Y%m%d)

# Cron pour backup automatique quotidien
0 3 * * * /scripts/backup_evolution.sh
```

---

## 15. Monitoring et logs

### 15.1 Vérifier la santé de l'API

```bash
# Health check simple
curl http://localhost:8080

# Vérifier toutes les instances
curl http://localhost:8080/instance/fetchInstances \
  -H "apikey: VOTRE_CLE_API"
```

### 15.2 Logs Docker

```bash
# Logs en temps réel
docker compose logs -f evolution-api

# Dernières 100 lignes
docker compose logs --tail=100 evolution-api

# Logs depuis une date
docker compose logs --since="2024-01-01T00:00:00" evolution-api
```

### 15.3 Logs PM2

```bash
pm2 logs evolution-api --lines 200
```

### 15.4 Niveaux de log recommandés

| Environnement | LOG_LEVEL | LOG_BAILEYS |
|--------------|-----------|-------------|
| Développement | DEBUG | info |
| Staging | INFO | error |
| Production | WARN | error |
| Debug problème | VERBOSE | debug |

---

## 16. Troubleshooting (Problèmes fréquents)

### ❌ Problème : QR Code ne se génère pas

**Causes possibles :**
1. L'instance n'existe pas → Vérifier avec `GET /instance/fetchInstances`
2. L'instance est déjà connectée → Vérifier avec `GET /instance/connectionState/{name}`
3. Conflit de nom → Supprimer et recréer l'instance

**Solution :**
```bash
# Vérifier l'état
curl -X GET http://localhost:8080/instance/connectionState/mon_instance \
  -H "apikey: VOTRE_CLE_API"

# Si état "open" : déjà connecté, pas besoin de QR code
# Si erreur 404 : instance n'existe pas, la créer
# Si état "close" : reconnecter
curl -X GET http://localhost:8080/instance/connect/mon_instance \
  -H "apikey: VOTRE_CLE_API"
```

### ❌ Problème : Pairing Code retourne un QR Code au lieu du code

**Cause :** L'instance a été créée avec `qrcode: true` au lieu de `qrcode: false`.

**Solution :**
```bash
# 1. Supprimer l'instance
curl -X DELETE http://localhost:8080/instance/delete/mon_instance \
  -H "apikey: VOTRE_CLE_API"

# 2. Attendre 2 secondes

# 3. Recréer avec les bons paramètres
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "mon_instance",
    "qrcode": false,
    "number": "22670000000",
    "integration": "WHATSAPP-BAILEYS"
  }'
```

### ❌ Problème : Messages ne s'envoient pas

**Vérifications :**
```bash
# 1. Instance connectée ?
curl -X GET http://localhost:8080/instance/connectionState/mon_instance \
  -H "apikey: VOTRE_CLE_API"
# Doit retourner state: "open"

# 2. Format du numéro correct ?
# ✅ 22670000000 (sans +, sans espaces)
# ❌ +226 56 63 60 39

# 3. Clé API correcte ?
# Vérifier que EVOLUTION_API_KEY dans .env correspond à AUTHENTICATION_API_KEY d'Evolution

# 4. Tester l'envoi direct
curl -X POST http://localhost:8080/message/sendText/mon_instance \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{"number": "22670000000", "text": "Test"}'
```

### ❌ Problème : Webhooks ne sont pas reçus par NeoChat Backend

**Vérifications :**
```bash
# 1. Webhook configuré pour l'instance ?
curl -X GET http://localhost:8080/webhook/find/mon_instance \
  -H "apikey: VOTRE_CLE_API"

# 2. URL du webhook accessible depuis Evolution API ?
# Si même serveur : http://localhost:3001/api/webhook/evolution
# Si Docker : http://host.docker.internal:3001/api/webhook/evolution
# Si serveurs différents : https://backend.neochat.pro/api/webhook/evolution

# 3. Tester manuellement
curl -X POST http://localhost:3001/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "instance": "test", "data": {}}'

# 4. Reconfigurer le webhook
curl -X POST http://localhost:8080/webhook/set/mon_instance \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://votre-backend.com/api/webhook/evolution",
      "webhook_by_events": false,
      "events": ["QRCODE_UPDATED", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"]
    }
  }'
```

### ❌ Problème : Instance se déconnecte fréquemment

**Causes possibles :**
1. Le téléphone a le mode économie d'énergie activé
2. WhatsApp n'est pas à jour sur le téléphone
3. Le téléphone n'a pas de connexion internet stable
4. WhatsApp a été ouvert sur un autre appareil qui a déconnecté la session

**Solutions :**
- Désactiver le mode économie d'énergie pour WhatsApp
- Mettre à jour WhatsApp à la dernière version
- S'assurer que le téléphone a une connexion WiFi stable
- Ne pas utiliser WhatsApp Web en parallèle (sauf si lié)

### ❌ Problème : Erreur 403 lors de la création d'instance

**Cause :** Nom d'instance déjà utilisé (session fantôme).

**Solution :** Utiliser le pattern hard delete :
```bash
# Logout
curl -X DELETE http://localhost:8080/instance/logout/mon_instance \
  -H "apikey: VOTRE_CLE_API"

# Delete
curl -X DELETE http://localhost:8080/instance/delete/mon_instance \
  -H "apikey: VOTRE_CLE_API"

# Attendre 2-3 secondes puis recréer
sleep 3
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "mon_instance", "qrcode": true, "integration": "WHATSAPP-BAILEYS"}'
```

### ❌ Problème : Evolution API ne démarre pas (Docker)

```bash
# Vérifier les logs
docker compose logs evolution-api

# Erreurs fréquentes :
# 1. "ECONNREFUSED" sur PostgreSQL → Vérifier DATABASE_CONNECTION_URI
# 2. "ECONNREFUSED" sur Redis → Vérifier CACHE_REDIS_URI
# 3. "port already in use" → Un autre service utilise le port 8080

# Vérifier la connectivité base de données
docker compose exec evolution-api sh -c "pg_isready -h HOST -p PORT"

# Redémarrer proprement
docker compose down
docker compose up -d
```

### ❌ Problème : Erreur de connexion à Supabase depuis Evolution API

```bash
# Tester la connexion directement
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Vérifications :
# 1. Le mot de passe ne contient pas de caractères spéciaux non encodés
# 2. Le pooler Supabase est utilisé (port 6543, pas 5432)
# 3. Le schema evolution existe (créé automatiquement au premier démarrage)
# 4. Les connexions IPv6 ne sont pas bloquées par le firewall
```

---

## 17. Migration depuis un fournisseur externe

### 17.1 Étapes de migration

1. **Installer Evolution API** (section 4 ou 5)
2. **Configurer les variables d'environnement** (section 6)
3. **Créer l'instance système** NeoChat_System (section 11.2)
4. **Scanner le QR Code** avec le numéro WhatsApp de l'entreprise
5. **Tester l'envoi** d'un message de test
6. **Mettre à jour le backend** NeoChat :
   - Remplacer les appels au fournisseur externe par les appels Evolution API
   - Vérifier que `EVOLUTION_API_URL` et `EVOLUTION_API_KEY` sont corrects
   - Vérifier que le webhook est configuré
7. **Tester le flux complet** : OTP, notifications, bot IA
8. **Désactiver le fournisseur externe** une fois tout validé

### 17.2 Correspondance des appels API

| Action | Ancien fournisseur (exemple) | Evolution API |
|--------|------------------------------|---------------|
| Envoyer texte | `POST /api/send` | `POST /message/sendText/{instance}` |
| Envoyer image | `POST /api/send-media` | `POST /message/sendMedia/{instance}` |
| Vérifier statut | `GET /api/status` | `GET /instance/connectionState/{instance}` |
| Webhook entrant | URL callback fournisseur | `POST /webhook/set/{instance}` |

### 17.3 Checklist de validation post-migration

- [ ] Evolution API est accessible (`curl http://localhost:8080`)
- [ ] Instance système créée et connectée (state: "open")
- [ ] Envoi d'OTP fonctionne (test avec un vrai numéro)
- [ ] Webhooks reçus par NeoChat Backend (vérifier les logs)
- [ ] Bot IA répond aux messages entrants
- [ ] Notifications de paiement envoyées
- [ ] Notifications de connexion/déconnexion fonctionnent
- [ ] Campagnes de diffusion fonctionnent
- [ ] Contacts et groupes récupérables
- [ ] Pairing Code fonctionne (si utilisé)
- [ ] Toutes les variables .env sont à jour en production

---

## 18. Résumé des endpoints API

### Instance Management

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/instance/create` | Créer une instance |
| GET | `/instance/fetchInstances` | Lister toutes les instances |
| GET | `/instance/connectionState/{name}` | Statut de connexion |
| GET | `/instance/connect/{name}` | Obtenir QR Code / Pairing Code |
| PUT | `/instance/restart/{name}` | Redémarrer |
| DELETE | `/instance/logout/{name}` | Déconnecter |
| DELETE | `/instance/delete/{name}` | Supprimer |

### Messaging

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/message/sendText/{name}` | Envoyer texte |
| POST | `/message/sendMedia/{name}` | Envoyer image/vidéo/document |
| POST | `/message/sendWhatsAppAudio/{name}` | Envoyer audio |
| POST | `/message/sendLocation/{name}` | Envoyer localisation |
| POST | `/message/sendContact/{name}` | Envoyer contact |
| POST | `/message/sendList/{name}` | Envoyer liste interactive |
| POST | `/message/sendButtons/{name}` | Envoyer boutons |

### Contacts & Chats

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/chat/findContacts/{name}` | Chercher des contacts |
| GET | `/chat/profilePic/{name}?number=XXX` | Photo de profil |
| PUT | `/chat/updateProfileName/{name}` | Modifier nom du profil |
| PUT | `/chat/updateProfileStatus/{name}` | Modifier statut |
| PUT | `/chat/updateProfilePicture/{name}` | Modifier photo |

### Groupes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/group/create/{name}` | Créer un groupe |
| GET | `/group/fetchAllGroups/{name}` | Lister les groupes |
| POST | `/group/updateParticipant/{name}` | Ajouter/retirer membres |
| DELETE | `/group/leaveGroup/{name}` | Quitter un groupe |

### Webhooks

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/webhook/set/{name}` | Configurer le webhook |
| GET | `/webhook/find/{name}` | Voir la config du webhook |

### Authentification

Toutes les requêtes nécessitent le header :
```
apikey: VOTRE_CLE_API_SECRETE
```

---

## Ressources utiles

- **Documentation officielle** : https://doc.evolution-api.com/
- **GitHub** : https://github.com/EvolutionAPI/evolution-api
- **Site web** : https://evolution-api.com
- **Discussions GitHub** : https://github.com/EvolutionAPI/evolution-api/discussions

---

> **Dernière mise à jour** : Ce guide est adapté pour Evolution API v2.x avec intégration WHATSAPP-BAILEYS. Vérifier la documentation officielle pour les mises à jour de l'API.
