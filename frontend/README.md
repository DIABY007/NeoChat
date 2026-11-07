# NeoChat Frontend

Frontend Next.js pour le système de chatbot WhatsApp NeoChat.

## Installation

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

Le frontend sera accessible sur http://localhost:3000

## Tests de l'Étape 4

### Test 1 : Page de login accessible
```
Ouvrir http://localhost:3000/login
```
**Résultat attendu :** Formulaire de connexion avec champs téléphone et code partenaire

### Test 2 : Capture du paramètre ?ref=
```
Ouvrir http://localhost:3000/login?ref=NEO226
```
**Résultat attendu :**
- Le champ "Code Partenaire" est automatiquement rempli avec "NEO226"
- Le champ est visuellement verrouillé (grisé avec icône 🔒)
- Un message vert s'affiche : "Code partenaire détecté : NEO226"
- Le code est stocké dans localStorage

### Test 3 : Persistance du code partenaire
```
1. Visiter /login?ref=NEO226
2. Fermer l'onglet
3. Rouvrir /login (sans paramètre)
```
**Résultat attendu :** Le code NEO226 est toujours présent et verrouillé

### Test 4 : Console logs
```
Ouvrir la console du navigateur (F12)
Visiter /login?ref=NEO226
```
**Résultat attendu :**
```
[Affiliation] Code parrain capturé: NEO226
```

## Structure

```
frontend/
├── app/
│   ├── login/
│   │   └── page.tsx       # Page de connexion avec capture affiliation
│   ├── layout.tsx         # Layout global
│   ├── page.tsx           # Page d'accueil
│   └── globals.css        # Styles globaux Tailwind
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## Fonctionnalités Implémentées

### Capture de l'Affiliation
- Détection automatique du paramètre `?ref=` dans l'URL
- Stockage dans `localStorage` pour persistance
- Verrouillage visuel du champ (disabled + style grisé)
- Message de confirmation avec réduction annoncée
- Logs console pour debug

### Interface Utilisateur
- Design moderne avec Tailwind CSS
- Formulaire responsive
- États de chargement
- Gestion des erreurs
- Messages de feedback utilisateur
