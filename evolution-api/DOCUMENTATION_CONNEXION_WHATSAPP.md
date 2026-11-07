# 📱 Documentation Complète : Connexion WhatsApp via Evolution API

**Version Evolution API** : v2.3.7+  
**Date** : 28 Mars 2026  
**Statut** : ✅ TESTÉ ET VALIDÉ

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Configuration Docker](#configuration-docker)
4. [Mode Pairing Code (Recommandé)](#mode-pairing-code)
5. [Mode QR Code (Alternative)](#mode-qr-code)
6. [Code Backend Complet](#code-backend-complet)
7. [Code Frontend Complet](#code-frontend-complet)
8. [Troubleshooting](#troubleshooting)
9. [Bonnes Pratiques](#bonnes-pratiques)

---

## 🎯 Vue d'ensemble

Evolution API propose **deux méthodes** pour connecter WhatsApp :

| Méthode | Avantages | Inconvénients | Recommandé pour |
|---------|-----------|---------------|-----------------|
| **Pairing Code** | ✅ Pas besoin de caméra<br>✅ Code à 8 caractères simple<br>✅ Meilleure UX mobile | ⚠️ Nécessite le numéro de téléphone<br>⚠️ Configuration plus complexe | Applications mobiles, UX moderne |
| **QR Code** | ✅ Très simple à implémenter<br>✅ Pas besoin de numéro | ⚠️ Nécessite une caméra<br>⚠️ Moins pratique sur mobile | Applications desktop, MVP rapide |

---

## 🔧 Prérequis

### Versions Requises

```json
{
  "evolution-api": "v2.3.7+",
  "node": "18+",
  "axios": "^1.6.0",
  "prisma": "^5.0.0" // Optionnel, pour la base de données
}
```

### Variables d'Environnement

```bash
# .env
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=votre_cle_api_secrete
```

---

## 🐳 Configuration Docker

### docker-compose.yml

```yaml
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:v2.3.7  # Version exacte recommandée
    container_name: evolution-api
    ports:
      - "8080:8080"
    environment:
      # Configuration serveur
      - SERVER_URL=http://localhost:8080
      - AUTHENTICATION_API_KEY=votre_cle_api_secrete
      
      # Base de données (PostgreSQL recommandé)
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://user:password@postgres:5432/evolution
      
      # Cache Redis (optionnel mais recommandé)
      - CACHE_REDIS_ENABLED=true
      - CACHE_REDIS_URI=redis://redis:6379/1
      
      # Configuration QR Code
      - QRCODE_LIMIT=30
      - QRCODE_COLOR=#198754
      
      # Configuration Session (important pour Pairing Code)
      - CONFIG_SESSION_PHONE_CLIENT=NeoChat
      - CONFIG_SESSION_PHONE_NAME=Chrome
      
    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store
    networks:
      - evolution-network
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: evolution-postgres
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=evolution
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - evolution-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: evolution-redis
    volumes:
      - redis_data:/data
    networks:
      - evolution-network
    restart: unless-stopped

volumes:
  evolution_instances:
  evolution_store:
  postgres_data:
  redis_data:

networks:
  evolution-network:
    driver: bridge
```

### Démarrage

```bash
docker-compose up -d
```

---

## 🔑 Mode Pairing Code

### Principe

1. Créer une instance avec `qrcode: false` + `number`
2. Attendre 2-3 secondes que l'instance s'initialise
3. Appeler `/instance/connect/{instance}?number={number}` avec le numéro en **query parameter**
4. Récupérer le `pairingCode` (ex: "WZYEH1YY")
5. L'utilisateur entre ce code dans WhatsApp

### Code Backend

```typescript
// services/evolutionInstanceService.ts

import axios from 'axios';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

export interface CreateInstanceResponse {
  instanceName: string;
  status: string;
}

export interface PairingCodeResponse {
  code: string;
  instanceName: string;
}

/**
 * Crée une instance WhatsApp en mode Pairing Code
 * 
 * @param instanceName - Nom unique de l'instance (sans espaces, utiliser underscores)
 * @param phoneNumber - Numéro de téléphone avec indicatif (ex: "22670000000")
 * @returns Promise<CreateInstanceResponse>
 */
export async function createInstancePairingCode(
  instanceName: string,
  phoneNumber: string
): Promise<CreateInstanceResponse> {
  try {
    // Nettoyer le numéro (seulement des chiffres)
    const cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');
    
    console.log(`[Evolution] 🚀 Création instance Pairing Code: ${instanceName}`);
    console.log(`[Evolution] 📱 Numéro: ${cleanedNumber}`);

    const requestBody = {
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: false,        // CRUCIAL: false pour Pairing Code
      number: cleanedNumber // CRUCIAL: numéro obligatoire
    };

    const response = await axios.post(
      `${EVOLUTION_API_URL}/instance/create`,
      requestBody,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[Evolution] ✅ Instance créée:`, response.data);

    // IMPORTANT: Attendre 2 secondes pour l'initialisation
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      instanceName,
      status: 'connecting',
    };
  } catch (error: any) {
    console.error(`[Evolution] ❌ Erreur création:`, error.message);
    if (error.response) {
      console.error(`[Evolution] Détails:`, error.response.data);
    }
    throw new Error(`Impossible de créer l'instance: ${error.message}`);
  }
}

/**
 * Récupère le Pairing Code pour une instance
 * 
 * IMPORTANT: Le numéro DOIT être passé en query parameter
 * depuis Evolution API v2.3.7, sinon l'API retourne un QR Code
 * 
 * @param instanceName - Nom de l'instance
 * @param phoneNumber - Numéro de téléphone
 * @returns Promise<PairingCodeResponse>
 */
export async function getPairingCode(
  instanceName: string,
  phoneNumber: string
): Promise<PairingCodeResponse> {
  try {
    const cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');
    
    console.log(`[Evolution] 🔑 Demande Pairing Code pour: ${instanceName}`);

    // Retry avec 5 tentatives (le code peut prendre quelques secondes)
    const maxRetries = 5;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Evolution] 📡 Tentative ${attempt}/${maxRetries}...`);
        
        // CRUCIAL: Le numéro DOIT être en query parameter
        const response = await axios.get(
          `${EVOLUTION_API_URL}/instance/connect/${encodeURIComponent(instanceName)}`,
          {
            params: {
              number: cleanedNumber,  // Query parameter OBLIGATOIRE
            },
            headers: {
              'apikey': EVOLUTION_API_KEY,
            },
          }
        );

        console.log('[Evolution] 📥 Réponse API:', response.data);

        // Vérifier si déjà connecté
        if (response.data?.instance?.state === 'open') {
          throw new Error('Instance déjà connectée à WhatsApp');
        }

        // Extraire le pairing code
        const pairingCode = response.data?.pairingCode;

        if (pairingCode) {
          console.log(`[Evolution] ✅ Pairing Code récupéré: ${pairingCode}`);
          
          return {
            code: pairingCode,
            instanceName,
          };
        }

        // Diagnostic: vérifier si en mode QR au lieu de Pairing
        if (response.data?.base64 || (response.data?.code && response.data.code.includes('@'))) {
          throw new Error('Instance en mode QR Code. Supprimez-la et recréez-la en mode Pairing Code.');
        }
        
        // Code pas encore disponible
        if (response.data?.count === 0) {
          console.log(`[Evolution] ⏳ Code pas encore disponible, attente...`);
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
        }
        
        throw new Error('Pairing code non disponible dans la réponse');
        
      } catch (error: any) {
        // Erreurs définitives
        if (error.message.includes('mode QR Code') || error.message.includes('déjà connectée')) {
          throw error;
        }
        
        // Retry pour les autres erreurs
        if (attempt < maxRetries) {
          console.log(`[Evolution] ⏳ Nouvelle tentative dans 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw error;
        }
      }
    }
    
    throw new Error(`Impossible de générer le code après ${maxRetries} tentatives`);
    
  } catch (error: any) {
    console.error(`[Evolution] ❌ Erreur Pairing Code:`, error.message);
    throw new Error(error.message || 'Impossible de générer le code de jumelage');
  }
}

/**
 * Vérifie le statut de connexion d'une instance
 */
export async function getInstanceStatus(instanceName: string): Promise<string> {
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${encodeURIComponent(instanceName)}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );

    return response.data?.instance?.state || 'close';
  } catch (error: any) {
    console.error(`[Evolution] ❌ Erreur statut:`, error.message);
    return 'close';
  }
}

/**
 * Supprime complètement une instance
 */
export async function deleteInstance(instanceName: string): Promise<void> {
  try {
    await axios.delete(
      `${EVOLUTION_API_URL}/instance/delete/${encodeURIComponent(instanceName)}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );
    
    console.log(`[Evolution] ✅ Instance supprimée: ${instanceName}`);
  } catch (error: any) {
    console.error(`[Evolution] ❌ Erreur suppression:`, error.message);
    throw error;
  }
}
```

### Routes API Backend

```typescript
// routes/instanceRoutes.ts

import { Router } from 'express';
import { 
  createInstancePairingCode, 
  getPairingCode,
  getInstanceStatus,
  deleteInstance
} from '../services/evolutionInstanceService';

const router = Router();

/**
 * POST /api/instances/create
 * Crée une nouvelle instance WhatsApp en mode Pairing Code
 */
router.post('/create', async (req, res) => {
  try {
    const { instanceName, phoneNumber } = req.body;

    if (!instanceName || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Le nom de l\'instance et le numéro sont requis',
      });
    }

    // Formater le nom (remplacer espaces par underscores)
    const formattedName = instanceName.trim().replace(/\s+/g, '_');

    const result = await createInstancePairingCode(formattedName, phoneNumber);

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[API] Erreur création instance:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/instances/pairing-code
 * Récupère le code de jumelage pour une instance
 */
router.post('/pairing-code', async (req, res) => {
  try {
    const { instanceName, phoneNumber } = req.body;

    if (!instanceName || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Le nom de l\'instance et le numéro sont requis',
      });
    }

    const result = await getPairingCode(instanceName, phoneNumber);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[API] Erreur pairing code:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/instances/:instanceName/status
 * Vérifie le statut de connexion
 */
router.get('/:instanceName/status', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const status = await getInstanceStatus(instanceName);

    return res.status(200).json({
      success: true,
      data: { status },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/instances/:instanceName
 * Supprime une instance
 */
router.delete('/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    await deleteInstance(instanceName);

    return res.status(200).json({
      success: true,
      message: 'Instance supprimée',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
```

### Frontend React/Next.js

```typescript
// components/PairingCodeConnection.tsx

'use client';

import { useState } from 'react';

export default function PairingCodeConnection() {
  const [instanceName, setInstanceName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'code' | 'connected'>('form');

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError('');

      // Étape 1: Créer l'instance
      const createRes = await fetch('/api/instances/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, phoneNumber }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || 'Erreur lors de la création');
      }

      // Étape 2: Récupérer le pairing code
      const codeRes = await fetch('/api/instances/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, phoneNumber }),
      });

      if (!codeRes.ok) {
        const data = await codeRes.json();
        throw new Error(data.error || 'Impossible de générer le code');
      }

      const { data } = await codeRes.json();
      setPairingCode(data.code);
      setStep('code');

      // Étape 3: Polling pour vérifier la connexion
      pollConnectionStatus();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pollConnectionStatus = async () => {
    const maxAttempts = 30; // 30 secondes max
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const res = await fetch(`/api/instances/${instanceName}/status`);
        const { data } = await res.json();

        if (data.status === 'open') {
          clearInterval(interval);
          setStep('connected');
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Erreur polling:', err);
      }
    }, 1000);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Connexion WhatsApp</h2>

      {step === 'form' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nom de l'instance
            </label>
            <input
              type="text"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="Mon WhatsApp Business"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Numéro de téléphone
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="22670000000"
              className="w-full px-4 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Avec indicatif pays, sans espaces ni symboles
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !instanceName || !phoneNumber}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Génération du code...' : 'Générer le code de jumelage'}
          </button>
        </div>
      )}

      {step === 'code' && (
        <div className="text-center space-y-4">
          <div className="p-6 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Votre code de jumelage</p>
            <p className="text-4xl font-mono font-bold text-green-600 tracking-widest">
              {pairingCode}
            </p>
          </div>

          <div className="text-left space-y-2 text-sm text-gray-600">
            <p className="font-medium">📱 Comment utiliser ce code :</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Ouvrez WhatsApp sur votre téléphone</li>
              <li>Allez dans Paramètres → Appareils connectés</li>
              <li>Appuyez sur "Connecter un appareil"</li>
              <li>Sélectionnez "Connecter avec un numéro"</li>
              <li>Entrez le code ci-dessus</li>
            </ol>
          </div>

          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
            <span>En attente de connexion...</span>
          </div>
        </div>
      )}

      {step === 'connected' && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-green-600">Connecté avec succès !</h3>
          <p className="text-gray-600">
            Votre WhatsApp est maintenant connecté à NeoChat
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 📷 Mode QR Code

### Code Backend

```typescript
/**
 * Crée une instance WhatsApp en mode QR Code
 */
export async function createInstanceQRCode(
  instanceName: string
): Promise<CreateInstanceResponse> {
  try {
    console.log(`[Evolution] 🚀 Création instance QR Code: ${instanceName}`);

    const requestBody = {
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,  // true pour QR Code
    };

    const response = await axios.post(
      `${EVOLUTION_API_URL}/instance/create`,
      requestBody,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[Evolution] ✅ Instance créée:`, response.data);

    return {
      instanceName,
      status: 'connecting',
    };
  } catch (error: any) {
    console.error(`[Evolution] ❌ Erreur création:`, error.message);
    throw new Error(`Impossible de créer l'instance: ${error.message}`);
  }
}

/**
 * Récupère le QR Code pour une instance
 */
export async function getQRCode(instanceName: string): Promise<string | null> {
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connect/${encodeURIComponent(instanceName)}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );

    if (response.data?.base64) {
      return `data:image/png;base64,${response.data.base64}`;
    }

    return null;
  } catch (error: any) {
    console.error(`[Evolution] ❌ Erreur QR Code:`, error.message);
    return null;
  }
}
```

### Frontend QR Code

```typescript
// components/QRCodeConnection.tsx

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function QRCodeConnection() {
  const [instanceName, setInstanceName] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleCreate = async () => {
    try {
      setLoading(true);

      // Créer l'instance
      await fetch('/api/instances/create-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName }),
      });

      // Démarrer le polling du QR Code
      startQRPolling();

    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startQRPolling = () => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/instances/${instanceName}/qr-code`);
        const { data } = await res.json();

        if (data.qrCode) {
          setQrCode(data.qrCode);
        }

        // Vérifier si connecté
        const statusRes = await fetch(`/api/instances/${instanceName}/status`);
        const statusData = await statusRes.json();

        if (statusData.data.status === 'open') {
          setConnected(true);
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Erreur polling:', err);
      }
    }, 2000);

    // Arrêter après 2 minutes
    setTimeout(() => clearInterval(interval), 120000);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Connexion QR Code</h2>

      {!qrCode && !connected && (
        <div className="space-y-4">
          <input
            type="text"
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value)}
            placeholder="Nom de l'instance"
            className="w-full px-4 py-2 border rounded-lg"
          />

          <button
            onClick={handleCreate}
            disabled={loading || !instanceName}
            className="w-full bg-blue-600 text-white py-3 rounded-lg"
          >
            {loading ? 'Génération...' : 'Générer le QR Code'}
          </button>
        </div>
      )}

      {qrCode && !connected && (
        <div className="text-center space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <Image
              src={qrCode}
              alt="QR Code WhatsApp"
              width={300}
              height={300}
              className="mx-auto"
            />
          </div>

          <p className="text-sm text-gray-600">
            Scannez ce QR Code avec WhatsApp
          </p>
        </div>
      )}

      {connected && (
        <div className="text-center">
          <h3 className="text-xl font-bold text-green-600">Connecté !</h3>
        </div>
      )}
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### Problème 1 : "Impossible de générer le code de jumelage"

**Cause** : Le numéro n'est pas passé en query parameter

**Solution** :
```typescript
// ❌ INCORRECT
axios.get(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`)

// ✅ CORRECT
axios.get(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
  params: { number: cleanedNumber }  // Query parameter OBLIGATOIRE
})
```

### Problème 2 : L'API retourne un QR Code au lieu du Pairing Code

**Cause** : L'instance n'a pas été créée avec `qrcode: false`

**Solution** :
```typescript
// Supprimer l'instance
await deleteInstance(instanceName);

// Recréer avec les bons paramètres
await createInstancePairingCode(instanceName, phoneNumber);
```

### Problème 3 : "count: 0" dans la réponse

**Cause** : Le code n'est pas encore généré (normal)

**Solution** : Implémenter un système de retry avec délais
```typescript
const maxRetries = 5;
for (let i = 0; i < maxRetries; i++) {
  const response = await getPairingCode(instanceName, phoneNumber);
  if (response.code) return response;
  await new Promise(r => setTimeout(r, 2000));
}
```

### Problème 4 : Instance se déconnecte régulièrement

**Cause** : Pas de webhook configuré pour maintenir la session

**Solution** : Configurer un webhook
```typescript
await axios.put(
  `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
  {
    url: 'https://votre-domaine.com/webhook/evolution',
    webhook_by_events: true,
    events: [
      'CONNECTION_UPDATE',
      'MESSAGES_UPSERT',
      'QRCODE_UPDATED'
    ]
  },
  {
    headers: { 'apikey': EVOLUTION_API_KEY }
  }
);
```

---

## ✅ Bonnes Pratiques

### 1. Validation du Numéro

```typescript
function validatePhoneNumber(phone: string): boolean {
  // Seulement des chiffres, minimum 10 caractères
  const cleaned = phone.replace(/[^0-9]/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}
```

### 2. Gestion des Erreurs

```typescript
try {
  const code = await getPairingCode(instanceName, phoneNumber);
  return code;
} catch (error: any) {
  if (error.message.includes('mode QR Code')) {
    // Suggérer de supprimer et recréer
    return { error: 'WRONG_MODE', action: 'recreate' };
  }
  if (error.message.includes('déjà connectée')) {
    return { error: 'ALREADY_CONNECTED' };
  }
  return { error: 'UNKNOWN', message: error.message };
}
```

### 3. Logs Structurés

```typescript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'INFO',
  service: 'evolution-api',
  action: 'create_instance',
  instanceName,
  mode: 'pairing_code',
  success: true
}));
```

### 4. Timeout et Retry

```typescript
const axiosWithTimeout = axios.create({
  timeout: 10000, // 10 secondes max
  retry: 3,
  retryDelay: 1000
});
```

### 5. Sécurité

```typescript
// Ne jamais exposer l'API Key côté client
// Toujours passer par votre backend

// ❌ DANGEREUX
const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
  headers: { 'apikey': EVOLUTION_API_KEY } // Exposé au client !
});

// ✅ SÉCURISÉ
const response = await fetch('/api/instances/create', {
  // Votre backend gère l'API Key
});
```

---

## 📚 Ressources

- **Documentation Evolution API** : https://doc.evolution-api.com
- **GitHub** : https://github.com/EvolutionAPI/evolution-api
- **Discord** : https://evolution-api.com/discord
- **Changelog** : https://github.com/EvolutionAPI/evolution-api/releases

---

## 🎯 Checklist de Déploiement

- [ ] Evolution API v2.3.7+ installé
- [ ] Variables d'environnement configurées
- [ ] PostgreSQL + Redis configurés (optionnel mais recommandé)
- [ ] Webhook configuré pour maintenir la session
- [ ] Système de retry implémenté (5 tentatives minimum)
- [ ] Validation du numéro de téléphone
- [ ] Gestion des erreurs complète
- [ ] Logs structurés
- [ ] Tests en environnement de développement
- [ ] Tests en production

---

**Dernière mise à jour** : 28 Mars 2026  
**Auteur** : NeoChat Team  
**Version** : 1.0.0

---

Cette documentation est prête à être utilisée sur n'importe quel projet nécessitant une connexion WhatsApp via Evolution API. Copiez-collez et adaptez selon vos besoins ! 🚀
