# 🧪 Guide de Test des Notifications de Paiement

## ✅ Fonctionnalités Implémentées

Les notifications de paiement sont **déjà implémentées** dans le système :

### 1. **Paiement Validé** (`paymentRoutes.ts:285-295`)
- Déclenché quand `status = 'paid' | 'completed' | 'success'`
- Message envoyé via `SystemMessagesService.sendPaymentSuccess()`
- Contenu : Félicitations + confirmation du plan activé

### 2. **Paiement Échoué** (`paymentRoutes.ts:328-333`)
- Déclenché quand `status = 'failed' | 'cancelled'`
- Message envoyé via `SystemMessagesService.sendPaymentFailed()`
- Contenu : Alerte d'échec + instructions pour réessayer

---

## 🧪 Comment Tester

### Prérequis
1. Serveur backend démarré (`npm run dev`)
2. Instance WhatsApp connectée (pour recevoir les messages)
3. Base de données avec des utilisateurs et abonnements

### Option 1 : Test avec le script TypeScript

```bash
# Installer ts-node si nécessaire
npm install -g ts-node

# Lancer le script de test
ts-node test-payment-webhook.ts
```

### Option 2 : Test manuel avec curl

#### Test Paiement Validé
```bash
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "cart_id": "VOTRE_CART_ID_REEL",
    "status": "paid",
    "amount": 5000,
    "metadata": {
      "plan": "ASSISTANT",
      "userId": "VOTRE_USER_ID"
    }
  }'
```

#### Test Paiement Échoué
```bash
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "cart_id": "VOTRE_CART_ID_REEL",
    "status": "failed",
    "amount": 5000
  }'
```

### Option 3 : Test avec Postman/Insomnia

**Endpoint:** `POST http://localhost:5000/api/payments/webhook`

**Headers:**
```
Content-Type: application/json
```

**Body (Succès):**
```json
{
  "cart_id": "test_cart_123",
  "status": "paid",
  "amount": 5000,
  "metadata": {
    "plan": "ASSISTANT"
  }
}
```

**Body (Échec):**
```json
{
  "cart_id": "test_cart_123",
  "status": "failed",
  "amount": 5000
}
```

---

## 📋 Checklist de Vérification

Après avoir envoyé un webhook de test, vérifiez :

- [ ] **Logs du serveur** : Messages de confirmation d'envoi
  ```
  [Payment Webhook] ✅ Notification de paiement réussi envoyée à +225XXXXXXXX
  ```
  ou
  ```
  [Payment Webhook] ✅ Notification d'échec de paiement envoyée à +225XXXXXXXX
  ```

- [ ] **WhatsApp** : Message reçu sur le téléphone de l'utilisateur

- [ ] **Base de données** : 
  - Pour succès : `subscription.status` mis à jour avec le plan
  - Pour succès : `subscription.nextBillingAt` défini à +30 jours
  - Pour échec : Aucune modification de l'abonnement

- [ ] **Commission parrainage** (si applicable) :
  - Vérifier que le parrain a reçu 2000 FCFA
  - Vérifier les logs de commission

---

## 🔍 Détails des Messages Envoyés

### Message de Succès
```
🎉 *Merci pour ton paiement, [Prénom] !*

Ton abonnement *[PLAN]* a été activé avec succès.

Tu peux désormais profiter de toutes les fonctionnalités de NeoChat.

📊 Consulte ton tableau de bord pour voir tes nouvelles limites.

💡 Besoin d'aide ? Réponds à ce message.
```

### Message d'Échec
```
❌ *Échec de paiement*

Ton paiement n'a pas pu être traité.

*Action requise :*
• Vérifie tes informations de paiement
• Réessaie la transaction

💡 Si tu as besoin d'aide, réponds directement à ce message.
```

---

## 🐛 Dépannage

### Les messages ne sont pas envoyés ?

1. **Vérifier l'instance WhatsApp**
   ```bash
   # Vérifier les instances actives
   curl http://localhost:8080/instance/fetchInstances \
     -H "apikey: VOTRE_API_KEY"
   ```

2. **Vérifier les logs du serveur**
   - Rechercher les erreurs dans la console
   - Vérifier que `SystemMessagesService.sendWhatsAppMessage()` est appelé

3. **Vérifier la configuration Evolution API**
   - Variable `EVOLUTION_API_URL` définie
   - Variable `EVOLUTION_API_KEY` définie
   - Instance système configurée

4. **Tester manuellement l'envoi de message**
   ```typescript
   await SystemMessagesService.sendPaymentSuccess(
     '+225XXXXXXXX',
     'Test',
     'ASSISTANT'
   );
   ```

---

## 📊 Statuts de Paiement Supportés

| Statut | Action | Message Envoyé |
|--------|--------|----------------|
| `paid` | ✅ Activer abonnement | Succès |
| `completed` | ✅ Activer abonnement | Succès |
| `success` | ✅ Activer abonnement | Succès |
| `failed` | ❌ Aucune action | Échec |
| `cancelled` | ❌ Aucune action | Échec |
| Autre | ℹ️ Aucune action | Aucun |

---

## 🚀 Test en Production

Pour tester avec de vrais webhooks Maketou :

1. Configurer l'URL du webhook dans Maketou :
   ```
   https://votre-domaine.com/api/payments/webhook
   ```

2. Effectuer un vrai paiement de test

3. Vérifier que Maketou envoie bien le webhook

4. Consulter les logs pour confirmer la réception et le traitement
