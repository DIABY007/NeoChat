# NeoChat Backend

Backend Node.js/Express pour le système de chatbot WhatsApp RAG et diffusion programmée.

## Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Configurer les variables dans .env (DATABASE_URL, REDIS, etc.)

# Générer le client Prisma
npm run prisma:generate

# Créer la base de données et exécuter les migrations
npm run prisma:migrate
```

## Démarrage

```bash
# Mode développement (avec hot-reload)
npm run dev

# Mode production
npm run build
npm start
```

## Tests de l'Étape 1

### Test 1 : Serveur démarre correctement
```bash
npm run dev
```
**Résultat attendu :** Le serveur doit démarrer sur le port 3001 et afficher :
- ✅ Server running on http://localhost:3001
- ✅ Health check: http://localhost:3001/health

### Test 2 : Route /health renvoie 200 OK
```bash
curl http://localhost:3001/health
```
**Résultat attendu :**
```json
{
  "status": "OK",
  "message": "NeoChat Backend is running",
  "timestamp": "2026-03-23T22:41:00.000Z"
}
```

### Test 3 : Redis connecté
Le terminal doit afficher : `✅ Redis connected successfully`

### Test 4 : Prisma Studio
```bash
npm run prisma:studio
```
**Résultat attendu :** Prisma Studio s'ouvre sur http://localhost:5555 et affiche les tables User, Subscription, Instance.

## Structure du Projet

```
NeoChatBackend/
├── prisma/
│   └── schema.prisma          # Schéma de base de données
├── src/
│   ├── config/
│   │   ├── prisma.ts          # Client Prisma
│   │   └── redis.ts           # Connexion Redis
│   ├── queues/
│   │   └── messageQueue.ts    # File BullMQ pour messages
│   └── server.ts              # Point d'entrée Express
├── .env.example               # Variables d'environnement
├── package.json
└── tsconfig.json
```
