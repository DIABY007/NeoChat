# 🚀 Guide de Déploiement NeoChat avec PM2

Ce guide explique comment configurer PM2 pour gérer automatiquement tous les processus NeoChat et les redémarrer automatiquement au démarrage du VPS.

## 📋 Prérequis

- Node.js installé
- npm installé
- Accès root ou sudo sur le VPS

## 1️⃣ Installation de PM2

```bash
# Installer PM2 globalement
sudo npm install -g pm2

# Vérifier l'installation
pm2 --version
```

## 2️⃣ Préparation du Backend

```bash
cd ~/Desktop/NeoChat/NeoChatBackend

# Installer les dépendances
npm install

# Générer le client Prisma
npm run prisma:generate

# Compiler le TypeScript
npm run build

# Créer le dossier logs
mkdir -p logs
```

## 3️⃣ Lancement avec PM2

```bash
# Retourner à la racine du projet
cd ~/Desktop/NeoChat

# Démarrer tous les processus avec PM2
pm2 start ecosystem.config.js

# Vérifier que tout fonctionne
pm2 status
pm2 logs
```

## 4️⃣ Configuration du Démarrage Automatique

```bash
# Sauvegarder la configuration actuelle de PM2
pm2 save

# Configurer PM2 pour démarrer au boot du système
pm2 startup

# ⚠️ IMPORTANT: La commande ci-dessus va afficher une commande à exécuter
# Copiez et exécutez cette commande (elle commence par 'sudo env PATH=...')
# Exemple de sortie:
# [PM2] You have to run this command as root. Execute the following command:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u diaby007 --hp /home/diaby007

# Après avoir exécuté la commande sudo, sauvegardez à nouveau:
pm2 save
```

## 5️⃣ Commandes Utiles PM2

### Gestion des processus
```bash
# Voir le statut de tous les processus
pm2 status

# Voir les logs en temps réel
pm2 logs

# Voir les logs d'un processus spécifique
pm2 logs neochat-backend
pm2 logs neochat-worker-message

# Redémarrer tous les processus
pm2 restart all

# Redémarrer un processus spécifique
pm2 restart neochat-backend

# Arrêter tous les processus
pm2 stop all

# Arrêter un processus spécifique
pm2 stop neochat-backend

# Supprimer tous les processus de PM2
pm2 delete all

# Recharger la configuration
pm2 reload ecosystem.config.js
```

### Monitoring
```bash
# Dashboard interactif
pm2 monit

# Informations détaillées sur un processus
pm2 show neochat-backend

# Statistiques de performance
pm2 describe neochat-backend
```

### Logs
```bash
# Voir les logs
pm2 logs

# Vider les logs
pm2 flush

# Logs des 100 dernières lignes
pm2 logs --lines 100
```

## 6️⃣ Mise à Jour du Code

Quand vous mettez à jour le code depuis GitHub:

```bash
cd ~/Desktop/NeoChat

# Récupérer les dernières modifications
git pull origin main

# Mettre à jour le backend
cd NeoChatBackend
npm install
npm run build

# Redémarrer les processus
cd ..
pm2 restart all

# Vérifier que tout fonctionne
pm2 status
pm2 logs --lines 50
```

## 7️⃣ Test du Redémarrage Automatique

Pour tester que tout redémarre bien au boot:

```bash
# Sauvegarder la configuration
pm2 save

# Redémarrer le VPS
sudo reboot

# Après le redémarrage, vérifier que PM2 a bien démarré
pm2 status
```

## 📊 Architecture des Processus

Le fichier `ecosystem.config.js` configure 4 processus:

1. **neochat-backend** - Serveur Express principal (port 3001)
2. **neochat-worker-message** - Worker pour traiter les messages WhatsApp
3. **neochat-worker-campaign** - Worker pour gérer les campagnes de diffusion
4. **neochat-worker-subscription** - Worker pour gérer les abonnements

Tous les processus:
- ✅ Redémarrent automatiquement en cas de crash
- ✅ Redémarrent automatiquement au boot du VPS
- ✅ Ont des logs séparés dans `NeoChatBackend/logs/`
- ✅ Sont limités en mémoire pour éviter les fuites

## 🔧 Dépannage

### Les processus ne démarrent pas
```bash
# Vérifier les logs d'erreur
pm2 logs --err

# Vérifier la compilation TypeScript
cd NeoChatBackend
npm run build
```

### PM2 ne démarre pas au boot
```bash
# Réexécuter la configuration startup
pm2 unstartup
pm2 startup
# Exécuter la commande sudo affichée
pm2 save
```

### Problème de mémoire
```bash
# Voir l'utilisation mémoire
pm2 monit

# Redémarrer un processus qui consomme trop
pm2 restart neochat-backend
```

## 🎯 Checklist de Déploiement

- [ ] PM2 installé globalement
- [ ] Backend compilé (`npm run build`)
- [ ] Dossier `logs/` créé
- [ ] Processus démarrés avec `pm2 start ecosystem.config.js`
- [ ] Configuration sauvegardée avec `pm2 save`
- [ ] Startup configuré avec `pm2 startup`
- [ ] Commande sudo exécutée
- [ ] Configuration finale sauvegardée avec `pm2 save`
- [ ] Test du redémarrage effectué

## 📞 Support

En cas de problème, vérifiez:
1. Les logs PM2: `pm2 logs`
2. Les logs système: `journalctl -u pm2-diaby007`
3. L'état des processus: `pm2 status`
4. La connexion à la base de données
5. La connexion à Redis
6. L'Evolution API (port 8080)

---

**Votre infrastructure NeoChat est maintenant totalement automatisée et résiliente !** 🎉
