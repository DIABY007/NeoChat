# NeoChat Backend - Documentation API Complète

## Base URL
```
http://localhost:3001/api
```

---

## 🔐 Authentification

### 1. Demander un OTP
```http
POST /auth/request-otp
Content-Type: application/json

{
  "phone": "+221771234567",
  "referralCode": "NEO226" // Optionnel
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Code OTP envoyé",
  "data": {
    "phone": "+221771234567",
    "expiresIn": "5 minutes",
    "isNewUser": false
  }
}
```

### 2. Vérifier l'OTP et obtenir le JWT
```http
POST /auth/verify-otp
Content-Type: application/json

{
  "phone": "+221771234567",
  "otpCode": "1234"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Authentification réussie",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "phone": "+221771234567",
      "referralCode": "NEO45676878",
      "referredBy": "NEO226",
      "walletBalance": 0
    },
    "subscription": {
      "status": "TRIAL",
      "messageCount": 0,
      "trialEndsAt": "2026-03-26T23:10:56.878Z",
      "nextBillingAt": null
    },
    "instances": []
  }
}
```

---

## 📱 Gestion des Instances WhatsApp

**Toutes les routes nécessitent le header** : `Authorization: Bearer {token}`

### 1. Créer une instance
```http
POST /instances/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "instanceName": "MyBusiness"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Instance créée avec succès",
  "data": {
    "instance": {
      "id": "uuid",
      "instanceName": "MyBusiness",
      "status": "QR_READY"
    },
    "qrCode": "data:image/png;base64,..."
  }
}
```

### 2. Obtenir le QR Code
```http
GET /instances/{instanceName}/qr
Authorization: Bearer {token}
```

### 3. Lister les instances
```http
GET /instances/list
Authorization: Bearer {token}
```

### 4. Supprimer une instance
```http
DELETE /instances/{instanceName}
Authorization: Bearer {token}
```

### 5. Obtenir le statut
```http
GET /instances/{instanceName}/status
Authorization: Bearer {token}
```

---

## 🤖 Configuration Dify (IA)

### 1. Configurer l'app Dify
```http
POST /dify/configure/{instanceName}
Authorization: Bearer {token}
Content-Type: application/json

{
  "difyAppId": "app-abc123"
}
```

### 2. Vérifier la configuration
```http
GET /dify/status/{instanceName}
Authorization: Bearer {token}
```

---

## 👥 Contacts et Groupes

### 1. Récupérer tous les contacts et groupes
```http
GET /contacts/{instanceName}
Authorization: Bearer {token}
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "221771234567@s.whatsapp.net",
        "name": "Alice Martin",
        "phone": "221771234567",
        "profilePicUrl": "https://..."
      }
    ],
    "groups": [
      {
        "id": "120363123456789@g.us",
        "name": "Équipe Marketing",
        "participantsCount": 15,
        "profilePicUrl": "https://..."
      }
    ],
    "summary": {
      "totalContacts": 1,
      "totalGroups": 1
    }
  }
}
```

### 2. Récupérer uniquement les contacts
```http
GET /contacts/{instanceName}/contacts
Authorization: Bearer {token}
```

### 3. Récupérer uniquement les groupes
```http
GET /contacts/{instanceName}/groups
Authorization: Bearer {token}
```

---

## 📢 Campagnes de Diffusion

### 1. Créer une campagne
```http
POST /campaigns/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "instanceName": "MyBusiness",
  "name": "Promo du jour",
  "message": "{Bonjour|Salut} {client|ami}, profitez de notre {offre|promotion} !",
  "recipients": ["+221771111111", "+221772222222"],
  "scheduledAt": "2026-03-24T10:00:00.000Z"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Campagne créée avec succès",
  "data": {
    "campaign": {
      "id": "campaign_1774309611862_tvuluyqen",
      "name": "Promo du jour",
      "recipientsCount": 2,
      "scheduledAt": "2026-03-24T10:00:00.000Z",
      "status": "PENDING",
      "hasSpintax": true
    }
  }
}
```

### 2. Lister les campagnes
```http
GET /campaigns/list
Authorization: Bearer {token}
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "campaign_123",
        "name": "Promo du jour",
        "instanceName": "MyBusiness",
        "recipientsCount": 2,
        "processedCount": 2,
        "scheduledAt": "2026-03-24T10:00:00.000Z",
        "status": "COMPLETED",
        "createdAt": "2026-03-23T23:46:51.862Z"
      }
    ],
    "total": 1
  }
}
```

### 3. Détails d'une campagne
```http
GET /campaigns/{campaignId}
Authorization: Bearer {token}
```

---

## 💳 Paiement et Abonnement

### 1. Générer un lien de paiement
```http
POST /payment/checkout
Authorization: Bearer {token}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Lien de paiement généré avec succès",
  "data": {
    "paymentUrl": "https://pay.maketou.sn/checkout/cart_abc123",
    "cartId": "cart_abc123",
    "amount": 9000,
    "originalAmount": 10000,
    "discount": 1000,
    "hasReferral": true,
    "currency": "XOF"
  }
}
```

### 2. Vérifier le statut d'un paiement
```http
GET /payment/status/{cartId}
Authorization: Bearer {token}
```

### 3. Webhook Maketou (appelé par Maketou)
```http
POST /payment/webhook
Content-Type: application/json

{
  "cart_id": "cart_abc123",
  "status": "paid",
  "amount": 9000,
  "currency": "XOF"
}
```

---

## 📊 Webhook WhatsApp (appelé par Evolution API)

```http
POST /webhook/evolution
Content-Type: application/json

{
  "event": "messages.upsert",
  "instance": "MyBusiness",
  "data": {
    "key": {
      "remoteJid": "221771234567@s.whatsapp.net",
      "fromMe": false,
      "id": "msg_123"
    },
    "message": {
      "conversation": "Bonjour"
    }
  }
}
```

---

## ⚠️ Gestion des Erreurs

### Erreur 401 - Non authentifié
```json
{
  "success": false,
  "error": "Token d'authentification manquant"
}
```

### Erreur 403 - Abonnement expiré
```json
{
  "success": false,
  "error": "Abonnement expiré",
  "reason": "trial_expired" | "message_limit_reached" | "billing_expired",
  "details": {
    "trialEndsAt": "2026-03-23T01:02:24.991Z",
    "messageCount": 50,
    "messageLimit": 50
  }
}
```

### Erreur 404 - Ressource non trouvée
```json
{
  "success": false,
  "error": "Instance non trouvée"
}
```

### Erreur 500 - Erreur serveur
```json
{
  "success": false,
  "error": "Une erreur est survenue",
  "details": "Error message (en développement uniquement)"
}
```

---

## 📈 Statuts et Enums

### Statuts d'Abonnement
- `TRIAL` : Période d'essai (3 jours ou 50 messages)
- `ACTIVE` : Abonnement actif (30 jours)
- `EXPIRED` : Abonnement expiré
- `BIG_FISH` : Abonnement illimité

### Statuts d'Instance
- `QR_READY` : En attente de scan du QR code
- `CONNECTED` : Instance connectée
- `DISCONNECTED` : Instance déconnectée

### Statuts de Campagne
- `PENDING` : En attente de traitement
- `PROCESSING` : En cours de traitement
- `COMPLETED` : Terminée
- `FAILED` : Échouée

---

## 🔒 Sécurité

### Headers Requis
```http
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### Durée de Validité du JWT
- **7 jours** (604800 secondes)

### Renouvellement du Token
- Demander un nouvel OTP et vérifier pour obtenir un nouveau token

---

## 🚀 Exemples d'Intégration Frontend

### React/Next.js avec Axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Rediriger vers login
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      const { reason } = error.response.data;
      if (reason === 'trial_expired' || reason === 'message_limit_reached') {
        // Rediriger vers page de paiement
        window.location.href = '/subscribe';
      }
    }
    return Promise.reject(error);
  }
);

// Exemples d'utilisation
export const authService = {
  requestOTP: (phone: string, referralCode?: string) =>
    api.post('/auth/request-otp', { phone, referralCode }),
  
  verifyOTP: (phone: string, otpCode: string) =>
    api.post('/auth/verify-otp', { phone, otpCode }),
};

export const instanceService = {
  create: (instanceName: string) =>
    api.post('/instances/create', { instanceName }),
  
  list: () =>
    api.get('/instances/list'),
  
  delete: (instanceName: string) =>
    api.delete(`/instances/${instanceName}`),
};

export const campaignService = {
  create: (data: CampaignData) =>
    api.post('/campaigns/create', data),
  
  list: () =>
    api.get('/campaigns/list'),
};

export const paymentService = {
  checkout: () =>
    api.post('/payment/checkout'),
};
```

---

## 📝 Notes Importantes

1. **Rate Limiting** : Le système envoie maximum 1 message toutes les 5 secondes par instance pour éviter les bans WhatsApp

2. **Spintax** : Utilisez la syntaxe `{option1|option2|option3}` pour créer des variations de messages

3. **Abonnement TRIAL** : 
   - Durée : 3 jours
   - Limite : 50 messages
   - Expire automatiquement si l'une des conditions est atteinte

4. **Commission de Parrainage** :
   - Remise : 1 000 FCFA pour le filleul
   - Commission : 2 000 FCFA pour le parrain

5. **Webhook** : Configurez l'URL du webhook dans Evolution API : `http://votre-domaine.com/api/webhook/evolution`

---

## 🛠️ Variables d'Environnement Requises

```bash
# Base de données
DATABASE_URL=postgresql://neochat_user:your_password_here@localhost:5432/neochat

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_jwt_secret_here

# Evolution API
EVOLUTION_API_URL=https://evolution-api.com
EVOLUTION_API_KEY=your_evolution_api_key

# Dify AI
DIFY_API_URL=https://api.dify.ai/v1
DIFY_API_KEY=your_dify_api_key

# Maketou
MAKETOU_API_URL=https://api.maketou.sn
MAKETOU_API_KEY=your_maketou_api_key

# URLs
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Port
PORT=3001
```

---

**Dernière mise à jour** : 24 mars 2026
**Version** : 1.0.0
**Développeur** : Cascade AI
