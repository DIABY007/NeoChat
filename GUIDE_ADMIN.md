# Guide d'utilisation — Portail Admin NeoChat (UAUBEN)

## 1. Connexion

**URL :** `/uauben-login`

1. Saisissez votre **numéro de téléphone** (format international, ex: +226 XX XX XX XX)
2. Cliquez sur **"Envoyer le code"**
3. Vous recevez un **code à 4 chiffres** sur WhatsApp (via l'instance System)
4. Saisissez les 4 chiffres → automatiquement redirigé vers `/dashboard-uauben`

> ⚠️ Seuls les numéros enregistrés dans la table `admin_users` peuvent se connecter.
> Pour ajouter un admin : `INSERT INTO admin_users (phone_number, role, name) VALUES ('+226XXXXXXXX', 'SECRETARY', 'Nom');`

---

## 2. Dashboard secrétariat — `/dashboard-uauben`

### Section A : Mise à jour du document institutionnel

C'est le document que le bot WhatsApp (instance `UAUBEN_SCHOOLL`) utilisera pour répondre aux questions.

**Marche à suivre :**

1. **Glisser-déposer** un fichier PDF dans la zone, ou cliquer pour parcourir
2. Le PDF est extrait **côté serveur** par `pdf-parse` (pas d'IA, déterministe)
3. Le texte extrait s'affiche dans une zone de texte **en lecture seule** pour validation
4. Vérifiez que le contenu est correct et lisible
5. Cliquez sur **"Confirmer et Mettre en ligne"**
6. L'ancien document passe en `ARCHIVED`, le nouveau en `ACTIVE`

### Section B : Annonces express (à venir)

Bientôt disponible — permettra de publier des annonces temporaires.

---

## 3. Comment le bot utilise ces données

Quand un utilisateur envoie un message à l'instance `UAUBEN_SCHOOLL` :

```
Message entrant → Webhook → Vérifie UAUBEN_SCHOOLL ?
                             ↓ OUI
                    Récupère annonces ACTIVE + document institutionnel
                             ↓
                    Injecte dans le prompt du LLM :
                    ⚠️ ANNONCES EXPRESS (prioritaires)
                    📄 DOCUMENT INSTITUTIONNEL
                             ↓
                    Le LLM répond avec le contexte
```

**Règle importante :** Les annonces express **écrasent** toute information contradictoire dans le document. En cas de conflit, l'annonce fait foi.

---

## 4. API disponibles

| Méthode | Endpoint | Usage |
|---------|----------|-------|
| `GET` | `/api/admin/agent-context` | Contexte complet (JSON) |
| `GET` | `/api/admin/agent-context/raw` | Texte brut pour injection LLM |
| `POST` | `/api/admin/documents/preview` | Upload PDF → extraction texte |
| `POST` | `/api/admin/documents/publish` | Archiver ancien + publier nouveau |
| `GET` | `/api/admin/documents` | Lister les documents |

---

## 5. Base de données — Tables admin

```
admin_users
├── phone_number (UNIQUE)  → Numéro de connexion
├── role                   → SUPER_ADMIN | ADMIN | SECRETARY
├── status                 → ACTIVE | ARCHIVED
├── otp_code               → Code temporaire (4 chiffres)
└── otp_expiry             → Expiration du code (5 min)

knowledge_documents (table: knowledge_documents)
├── title                  → Titre du document
├── content_markdown       → Texte extrait du PDF
├── status                 → ACTIVE | ARCHIVED
└── uploaded_by            → FK vers admin_users

annonces_express
├── message                → Contenu de l'annonce
├── expires_at             → Date d'expiration (obligatoire)
├── status                 → ACTIVE | ARCHIVED
└── created_by             → FK vers admin_users
```

---

## 6. Déploiement / Première utilisation

```sql
-- 1. Insérer un super-admin
INSERT INTO admin_users (phone_number, role, name)
VALUES ('+226XXXXXXXX', 'SUPER_ADMIN', 'Admin Principal');

-- 2. Insérer une secrétaire
INSERT INTO admin_users (phone_number, role, name)
VALUES ('+226YYYYYYYY', 'SECRETARY', 'Secrétaire');

-- 3. Vérifier les admins
SELECT id, phone_number, role, status, created_at FROM admin_users;
```

**Fichiers clés du projet :**

| Fichier | Rôle |
|---------|------|
| `frontend/app/uauben-login/page.tsx` | Page de connexion admin |
| `frontend/app/dashboard-uauben/page.tsx` | Dashboard secrétariat |
| `NeoChatBackend/src/routes/adminAuthRoutes.ts` | Auth OTP admin |
| `NeoChatBackend/src/routes/adminRoutes.ts` | CRUD documents + annonces |
| `NeoChatBackend/src/routes/adminAgentRoutes.ts` | Endpoint agent (contexte LLM) |
| `NeoChatBackend/src/services/adminContextService.ts` | Fonction utilitaire de contexte |
| `NeoChatBackend/src/middleware/authMiddleware.ts` | Vérification admin (base de données) |