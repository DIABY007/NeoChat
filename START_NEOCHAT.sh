#!/bin/bash

# Script de démarrage rapide pour NeoChat
# Ce script compile et démarre tous les services avec PM2

set -e

echo "🚀 Démarrage de NeoChat..."

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Aller à la racine du projet
cd "$(dirname "$0")"

echo -e "${BLUE}📦 Compilation du backend...${NC}"
cd NeoChatBackend

# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📥 Installation des dépendances...${NC}"
    npm install
fi

# Générer le client Prisma
echo -e "${BLUE}🔧 Génération du client Prisma...${NC}"
npm run prisma:generate

# Compiler TypeScript
echo -e "${BLUE}⚙️  Compilation TypeScript...${NC}"
npm run build

# Créer le dossier logs s'il n'existe pas
mkdir -p logs

# Retour à la racine
cd ..

# Démarrer avec PM2
echo -e "${BLUE}🎯 Démarrage des processus avec PM2...${NC}"
pm2 start ecosystem.config.js

# Sauvegarder la configuration
pm2 save

echo -e "${GREEN}✅ NeoChat démarré avec succès !${NC}"
echo ""
echo "📊 Commandes utiles:"
echo "  - Voir le statut:     pm2 status"
echo "  - Voir les logs:      pm2 logs"
echo "  - Redémarrer:         pm2 restart all"
echo "  - Arrêter:            pm2 stop all"
echo ""
echo "🌐 Services:"
echo "  - Backend API:        http://localhost:3001"
echo "  - Health Check:       http://localhost:3001/health"
echo ""
