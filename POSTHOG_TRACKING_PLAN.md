# NeoChat PostHog Tracking Plan
## Guide complet pour la prise de décision data-driven

---

## 🎯 Objectif
Ne jamais prendre de décisions au feeling. Chaque feature, changement UX, ou pivot business doit être basé sur des données réelles.

---

## 📊 Métriques Clés (North Star Metrics)

### 1. **Activation Rate**
- % d'utilisateurs qui connectent au moins 1 instance WhatsApp dans les 24h après inscription
- **Objectif** : > 60%

### 2. **Retention Rate**
- % d'utilisateurs actifs après 7 jours, 30 jours
- **Objectif** : D7 > 40%, D30 > 25%

### 3. **Revenue per User (ARPU)**
- Revenu moyen par utilisateur actif mensuel
- **Objectif** : évolution mensuelle positive

### 4. **Conversion to Paid**
- % d'utilisateurs gratuits qui passent à un plan payant
- **Objectif** : > 5%

---

## 🔥 Événements à Capturer

### **A. Authentification & Onboarding**

#### `user_registration_started`
**Quand** : User clique sur "S'inscrire"
```typescript
posthog.capture('user_registration_started', {
  source: 'landing_page' | 'pricing_page' | 'referral_link',
  referral_code: referralCode || null
})
```
**Décisions** : Quel canal d'acquisition convertit le mieux ?

---

#### `otp_requested`
**Quand** : User demande un code OTP
```typescript
posthog.capture('otp_requested', {
  phone_country_code: phoneNumber.slice(0, 3),
  is_retry: isRetry
})
```
**Décisions** : Taux d'échec OTP par pays ? Besoin d'améliorer la délivrabilité SMS ?

---

#### `otp_verified_success`
**Quand** : OTP validé avec succès
```typescript
posthog.capture('otp_verified_success', {
  phone_country_code: phoneNumber.slice(0, 3),
  attempts_count: attemptCount,
  time_to_verify_seconds: timeElapsed
})
```
**Décisions** : Combien de tentatives en moyenne ? Besoin de simplifier le flow ?

---

#### `otp_verification_failed`
**Quand** : OTP invalide
```typescript
posthog.capture('otp_verification_failed', {
  phone_country_code: phoneNumber.slice(0, 3),
  error_type: 'expired' | 'invalid_code' | 'max_attempts',
  attempts_count: attemptCount
})
```
**Décisions** : Taux d'abandon à cette étape ? Problème de UX ?

---

#### `user_registered_complete`
**Quand** : Inscription finalisée (après OTP)
```typescript
posthog.identify(userId, {
  phone: phoneNumber,
  country_code: phoneNumber.slice(0, 3),
  referral_code: user.referralCode,
  referred_by: user.referredBy || null,
  created_at: user.createdAt,
  plan: 'free'
})

posthog.capture('user_registered_complete', {
  has_referrer: !!user.referredBy,
  registration_duration_seconds: timeElapsed
})
```
**Décisions** : Combien d'users viennent du referral ? Optimiser le programme d'affiliation ?

---

### **B. Instances WhatsApp**

#### `instance_creation_started`
**Quand** : User clique "Créer une instance"
```typescript
posthog.capture('instance_creation_started', {
  connection_method: 'pairing_code' | 'qr_code',
  instances_count_before: currentInstancesCount
})
```
**Décisions** : Les users préfèrent pairing code ou QR ? Faut-il cacher une méthode ?

---

#### `instance_created_success`
**Quand** : Instance créée (backend confirme)
```typescript
posthog.capture('instance_created_success', {
  instance_name: instanceName,
  connection_method: 'pairing_code' | 'qr_code',
  phone_country_code: phoneNumber.slice(0, 3),
  is_first_instance: instancesCount === 1,
  time_to_create_seconds: timeElapsed
})
```
**Décisions** : Combien de temps pour créer une instance ? Flow trop long ?

---

#### `pairing_code_generated`
**Quand** : Code de jumelage généré
```typescript
posthog.capture('pairing_code_generated', {
  instance_name: instanceName,
  is_manual_refresh: isManualRefresh,
  code_generation_attempt: attemptNumber
})
```
**Décisions** : Combien de refresh avant connexion ? Timer trop court/long ?

---

#### `pairing_code_copied`
**Quand** : User copie le code
```typescript
posthog.capture('pairing_code_copied', {
  instance_name: instanceName,
  time_left_seconds: timeLeft
})
```
**Décisions** : Les users copient le code rapidement ? Besoin d'un bouton plus visible ?

---

#### `instance_connected_success`
**Quand** : Instance passe à CONNECTED
```typescript
posthog.capture('instance_connected_success', {
  instance_name: instanceName,
  connection_method: 'pairing_code' | 'qr_code',
  time_to_connect_seconds: timeElapsed,
  pairing_code_refreshes_count: refreshCount,
  is_first_instance: instancesCount === 1
})
```
**Décisions** : Taux de succès pairing vs QR ? Temps moyen de connexion ?

---

#### `instance_connection_failed`
**Quand** : Échec de connexion
```typescript
posthog.capture('instance_connection_failed', {
  instance_name: instanceName,
  connection_method: 'pairing_code' | 'qr_code',
  error_type: 'timeout' | 'invalid_code' | 'api_error',
  time_spent_seconds: timeElapsed
})
```
**Décisions** : Principale cause d'échec ? Besoin de meilleur messaging d'erreur ?

---

#### `instance_disconnected_by_provider`
**Quand** : Le backend reçoit une erreur 401 ou 428 d'Evolution API (déconnexion forcée par WhatsApp/Meta)
**Déclencheur** : Backend uniquement (posthog-node)
```typescript
posthogNode.capture({
  distinctId: userId,
  event: 'instance_disconnected_by_provider',
  properties: {
    instance_name: instanceName,
    reason_code: errorCode, // 401 | 428
    time_since_connection_minutes: minutesSinceConnected
  }
})
```
**Décisions** : Détecter une vague de bans WhatsApp en cours. Identifier les utilisateurs impactés avant qu'ils ne se plaignent.

---

#### `instance_deleted`
**Quand** : User supprime une instance
```typescript
posthog.capture('instance_deleted', {
  instance_name: instanceName,
  was_connected: status === 'CONNECTED',
  instance_age_days: daysSinceCreation,
  reason: 'user_action' | 'error_cleanup'
})
```
**Décisions** : Pourquoi les users suppriment ? Problème de stabilité ?

---

### **C. Bot Configuration**

#### `bot_activated`
**Quand** : User active le bot IA
```typescript
posthog.capture('bot_activated', {
  instance_name: instanceName,
  has_custom_prompt: !!systemPrompt,
  knowledge_docs_count: documentsCount,
  time_since_instance_created_hours: hoursSinceCreation
})
```
**Décisions** : Combien de temps avant d'activer le bot ? Feature bien comprise ?

---

#### `bot_deactivated`
**Quand** : User désactive le bot
```typescript
posthog.capture('bot_deactivated', {
  instance_name: instanceName,
  was_active_for_hours: hoursActive,
  messages_handled_count: messagesCount
})
```
**Décisions** : Pourquoi désactiver ? Bot pas performant ? Coût trop élevé ?

---

#### `bot_first_message_handled`
**Quand** : Le bot traite automatiquement son tout premier message entrant sur une instance
**Déclencheur** : Backend uniquement (posthog-node)
```typescript
posthogNode.capture({
  distinctId: userId,
  event: 'bot_first_message_handled',
  properties: {
    instance_name: instanceName,
    hours_since_activation: hoursSinceBotActivated,
    had_knowledge_docs: docsCount > 0,
    response_had_context: contextFound // true si RAG a trouvé un résultat
  }
})
```
**Décisions** : C'est le vrai Aha Moment. Mesurer le délai entre activation et premier message géré. Si délai > 24h, l'utilisateur ne voit pas la valeur pendant son trial.

---

#### `bot_response_no_context_found`
**Quand** : Le pipeline RAG ne trouve aucun résultat au-dessus du seuil de similarité (0.3)
**Déclencheur** : Backend uniquement (posthog-node)
```typescript
posthogNode.capture({
  distinctId: userId,
  event: 'bot_response_no_context_found',
  properties: {
    instance_name: instanceName,
    knowledge_docs_count: docsCount,
    has_system_prompt: !!systemPrompt
  }
})
```
**Décisions** : Si taux élevé → la base de connaissances est insuffisante ou mal configurée. Signal pour proposer un onboarding de la KB plus guidé.

---

#### `bot_prompt_updated`
**Quand** : User modifie le prompt système
```typescript
posthog.capture('bot_prompt_updated', {
  instance_name: instanceName,
  prompt_length_chars: systemPrompt.length,
  is_first_customization: !hadPromptBefore
})
```
**Décisions** : Les users personnalisent le bot ? Besoin de templates ?

---

#### `knowledge_document_added`
**Quand** : User ajoute un document à la base de connaissances
```typescript
posthog.capture('knowledge_document_added', {
  instance_name: instanceName,
  document_type: 'text' | 'pdf',
  document_size_kb: fileSizeKB,
  total_docs_count: totalDocsCount
})
```
**Décisions** : Type de docs le plus utilisé ? Limite de taille suffisante ?

---

#### `blacklist_contact_added`
**Quand** : User ajoute un contact à la blacklist
```typescript
posthog.capture('blacklist_contact_added', {
  instance_name: instanceName,
  blacklist_size: blacklistCount
})
```
**Décisions** : Feature utilisée ? Besoin de bulk import ?

---

### **D. Campagnes de Diffusion**

#### `campaign_creation_started`
**Quand** : User clique "Créer une campagne"
```typescript
posthog.capture('campaign_creation_started', {
  instance_name: instanceName,
  campaigns_count_before: campaignsCount
})
```
**Décisions** : Feature découverte rapidement ? Besoin de tutorial ?

---

#### `campaign_created_success`
**Quand** : Campagne créée et planifiée
```typescript
posthog.capture('campaign_created_success', {
  instance_name: instanceName,
  recipients_count: campaign.totalCount,
  has_media: !!campaign.mediaUrl,
  media_type: campaign.mediaType || null,
  is_scheduled: campaign.scheduledAt > new Date(),
  schedule_delay_hours: hoursDiff,
  message_length_chars: campaign.message.length
})
```
**Décisions** : Taille moyenne des campagnes ? Media utilisé ? Planification ou envoi immédiat ?

---

#### `campaign_started`
**Quand** : Campagne commence l'envoi
```typescript
posthog.capture('campaign_started', {
  campaign_id: campaign.id,
  instance_name: campaign.instanceName,
  recipients_count: campaign.totalCount,
  has_media: !!campaign.mediaUrl
})
```
**Décisions** : Combien de campagnes lancées par jour ? Peak hours ?

---

#### `campaign_message_sent`
**Quand** : Message individuel envoyé (batch tous les 10 messages)
```typescript
posthog.capture('campaign_message_sent', {
  campaign_id: campaign.id,
  instance_name: campaign.instanceName,
  progress_percent: (processedCount / totalCount) * 100,
  batch_number: Math.floor(processedCount / 10)
})
```
**Décisions** : Taux de succès d'envoi ? Besoin d'optimiser le worker ?

---

#### `campaign_completed`
**Quand** : Campagne terminée
```typescript
posthog.capture('campaign_completed', {
  campaign_id: campaign.id,
  instance_name: campaign.instanceName,
  recipients_count: campaign.totalCount,
  success_count: successCount,
  success_rate: (successCount / campaign.totalCount) * 100,
  duration_minutes: durationMinutes,
  messages_per_minute: successCount / durationMinutes
})
```
**Décisions** : Performance du système ? Taux d'échec acceptable ?

---

#### `campaign_paused`
**Quand** : User met en pause
```typescript
posthog.capture('campaign_paused', {
  campaign_id: campaign.id,
  progress_percent: (processedCount / totalCount) * 100,
  reason: 'user_action'
})
```
**Décisions** : Pourquoi pause ? Problème détecté ?

---

#### `campaign_duplicated`
**Quand** : User duplique une campagne
```typescript
posthog.capture('campaign_duplicated', {
  original_campaign_id: originalId,
  instance_name: instanceName
})
```
**Décisions** : Feature utile ? Besoin de templates pré-faits ?

---

### **E. Billing & Monétisation**

#### `pricing_page_viewed`
**Quand** : User visite /pricing
```typescript
posthog.capture('pricing_page_viewed', {
  user_plan: currentPlan,
  instances_count: instancesCount,
  days_since_registration: daysSinceRegistration
})
```
**Décisions** : Quand les users consultent les prix ? Trigger d'upgrade ?

---

#### `plan_upgrade_clicked`
**Quand** : User clique sur un bouton d'upgrade
```typescript
posthog.capture('plan_upgrade_clicked', {
  from_plan: currentPlan,
  to_plan: targetPlan,
  trigger_location: 'pricing_page' | 'instance_limit' | 'campaign_limit',
  instances_count: instancesCount
})
```
**Décisions** : Quel trigger convertit le mieux ? Limites bien placées ?

---

#### `checkout_started`
**Quand** : User démarre le paiement
```typescript
posthog.capture('checkout_started', {
  plan: selectedPlan,
  amount: planPrice,
  payment_method: 'orange_money' | 'moov_money' | 'wave'
})
```
**Décisions** : Taux d'abandon au checkout ? Méthode de paiement préférée ?

---

#### `payment_completed`
**Quand** : Paiement confirmé
```typescript
posthog.capture('payment_completed', {
  plan: selectedPlan,
  amount: paidAmount,
  payment_method: paymentMethod,
  time_to_complete_seconds: timeElapsed
})

posthog.setPersonProperties({
  plan: selectedPlan,
  lifetime_value: totalPaid,
  last_payment_date: new Date()
})
```
**Décisions** : Conversion rate ? Friction dans le flow de paiement ?

---

#### `payment_failed`
**Quand** : Échec de paiement
```typescript
posthog.capture('payment_failed', {
  plan: selectedPlan,
  amount: attemptedAmount,
  payment_method: paymentMethod,
  error_type: errorType
})
```
**Décisions** : Taux d'échec par méthode ? Problème d'intégration ?

---

#### `trial_message_quota_reached`
**Quand** : L'utilisateur atteint les 50 messages IA pendant le trial
**Déclencheur** : Backend (posthog-node)
```typescript
posthogNode.capture({
  distinctId: userId,
  event: 'trial_message_quota_reached',
  properties: {
    days_since_registration: daysSinceRegistration,
    had_bot_first_message: hadFirstMessage,
    knowledge_docs_count: docsCount
  }
})
```
**Décisions** : Si l'utilisateur atteint le quota avant la fin du trial → le trial est trop court. Si quota jamais atteint → problème d'activation, pas de durée.

---

#### `trial_expired_without_conversion`
**Quand** : Le trial expire sans qu'un paiement ait été effectué (cron job)
**Déclencheur** : Backend (posthog-node)
```typescript
posthogNode.capture({
  distinctId: userId,
  event: 'trial_expired_without_conversion',
  properties: {
    messages_used: messagesUsed, // sur 50
    had_instance_connected: hadInstanceConnected,
    had_bot_first_message: hadFirstMessage,
    days_active: daysActive
  }
})
```
**Décisions** : Segmenter les non-convertis : ceux qui n'ont jamais activé (problème onboarding) vs ceux qui ont utilisé le produit mais n'ont pas payé (problème pricing ou valeur perçue).

---

#### `subscription_cancelled`
**Quand** : User annule son abonnement
```typescript
posthog.capture('subscription_cancelled', {
  plan: currentPlan,
  subscription_duration_days: durationDays,
  reason: cancellationReason,
  instances_count: instancesCount,
  campaigns_sent_count: campaignsSentCount
})
```
**Décisions** : Churn rate ? Raisons principales ? Besoin de retention campaign ?

---

### **F. Referral & Affiliation**

#### `referral_link_copied`
**Quand** : User copie son lien de parrainage
```typescript
posthog.capture('referral_link_copied', {
  referral_code: user.referralCode,
  referrals_count: referralsCount,
  wallet_balance: walletBalance
})
```
**Décisions** : Feature utilisée ? Besoin de gamification ?

---

#### `referral_successful`
**Quand** : Un filleul s'inscrit via le lien
```typescript
posthog.capture('referral_successful', {
  referrer_id: referrerId,
  referee_id: newUserId,
  referrer_referrals_count: referralsCount
})
```
**Décisions** : Taux de conversion du referral ? Incentive suffisant ?

---

#### `wallet_withdrawal_requested`
**Quand** : User demande un retrait
```typescript
posthog.capture('wallet_withdrawal_requested', {
  amount: withdrawalAmount,
  payment_method: paymentMethod,
  wallet_balance_before: balanceBefore
})
```
**Décisions** : Montant moyen de retrait ? Délai acceptable ?

---

### **G. Engagement & Retention**

#### `page_viewed`
**Quand** : Navigation (auto-capturé par PostHog)
```typescript
// Auto-capturé, mais vous pouvez enrichir :
posthog.capture('$pageview', {
  user_plan: currentPlan,
  instances_count: instancesCount
})
```
**Décisions** : Pages les plus visitées ? Dead ends dans le funnel ?

---

#### `feature_discovered`
**Quand** : User utilise une feature pour la 1ère fois
```typescript
posthog.capture('feature_discovered', {
  feature_name: 'bot_config' | 'campaign' | 'blacklist' | 'knowledge_base',
  days_since_registration: daysSinceRegistration
})
```
**Décisions** : Time to value pour chaque feature ? Besoin d'onboarding ?

---

#### `session_duration`
**Quand** : User quitte (auto-capturé par PostHog)
```typescript
// Auto-capturé via session recordings
```
**Décisions** : Durée moyenne de session ? Engagement élevé ?

---

#### `user_inactive_7_days`
**Quand** : Détecté via cron job backend
```typescript
posthog.capture('user_inactive_7_days', {
  user_id: userId,
  last_login: lastLoginDate,
  instances_count: instancesCount,
  plan: userPlan
})
```
**Décisions** : Trigger email de réactivation ? Offre spéciale ?

---

### **H. Erreurs & Performance**

> ⚠️ Ces événements sont documentés ici pour référence, mais ne doivent PAS être implémentés dans PostHog. Utiliser Sentry ou un outil de monitoring dédié. PostHog est réservé aux événements produit et business.

#### `error_occurred`
**Quand** : Erreur frontend/backend
```typescript
posthog.capture('error_occurred', {
  error_type: 'api_error' | 'ui_error' | 'network_error',
  error_message: error.message,
  page: currentPage,
  user_plan: currentPlan
})
```
**Décisions** : Erreurs fréquentes ? Besoin de fix urgent ?

---

#### `api_response_slow`
**Quand** : API > 3 secondes
```typescript
posthog.capture('api_response_slow', {
  endpoint: '/instances/create',
  response_time_ms: responseTime,
  user_plan: currentPlan
})
```
**Décisions** : Endpoints à optimiser ? Problème d'infra ?

---

## 📈 Dashboards PostHog à Créer

### 1. **Acquisition Funnel**
```
Landing Page View → Registration Started → OTP Sent → OTP Verified → User Registered
```
**Objectif** : Identifier les points de friction dans l'inscription

---

### 2. **Activation Funnel**
```
User Registered → Instance Created → Instance Connected → Bot Activated → Bot First Message Handled
```
**Objectif** : Mesurer le "aha moment" produit

*`instance_connected_success` mesure l'activation technique. `bot_first_message_handled` mesure le vrai Aha Moment produit.*

---

### 3. **Retention Cohorts**
- % d'users actifs à D1, D7, D30
- Segmenté par : source d'acquisition, plan, pays

---

### 4. **Revenue Dashboard**
- MRR (Monthly Recurring Revenue)
- ARPU (Average Revenue Per User)
- Conversion rate Free → Paid
- Churn rate

---

### 5. **Feature Adoption**
- % d'users qui utilisent : Bot, Campaigns, Blacklist, Knowledge Base
- Time to adoption pour chaque feature

---

### 6. **Campaign Performance**
- Nombre de campagnes créées/jour
- Taille moyenne des campagnes
- Taux de succès d'envoi
- Messages envoyés/minute

---

## 🎯 Décisions Data-Driven : Exemples

### Exemple 1 : Optimiser l'onboarding
**Question** : Pourquoi seulement 40% des users connectent une instance ?

**Données à analyser** :
- Funnel `user_registered_complete` → `instance_creation_started` → `instance_connected_success`
- Temps moyen entre chaque étape
- Taux d'abandon par méthode (pairing vs QR)

**Actions possibles** :
- Si abandon à `instance_creation_started` → ajouter tutorial vidéo
- Si abandon à `pairing_code_generated` → augmenter le timer
- Si échec à `instance_connected_success` → améliorer messaging d'erreur

---

### Exemple 2 : Pricing optimal
**Question** : Quel prix maximise le revenu sans tuer la conversion ?

**Données à analyser** :
- Conversion rate par plan (Free → Starter → Pro)
- ARPU par plan
- Churn rate par plan
- Trigger d'upgrade (`plan_upgrade_clicked` location)

**Actions possibles** :
- Si conversion faible mais ARPU élevé → baisser le prix
- Si conversion élevée mais ARPU faible → augmenter le prix
- Si trigger = "instance_limit" → ajuster les limites

---

### Exemple 3 : Referral program ROI
**Question** : Le programme de parrainage est-il rentable ?

**Données à analyser** :
- % d'users qui copient leur lien (`referral_link_copied`)
- Taux de conversion referral → inscription
- LTV (Lifetime Value) des filleuls vs users organiques
- Coût du programme (commissions payées)

**Actions possibles** :
- Si LTV filleuls > coût → augmenter la commission
- Si taux de copie faible → améliorer le CTA
- Si conversion faible → simplifier le flow d'inscription

---

## 🚀 Implémentation Prioritaire

### Phase 1 : Core Events (Semaine 1) — PRIORITÉ ABSOLUE
Frontend (posthog-js) :
- [ ] `user_registration_started`
- [ ] `otp_requested` / `otp_verified_success` / `otp_verification_failed`
- [ ] `instance_creation_started`
- [ ] `pairing_code_generated` / `pairing_code_copied`
- [ ] `instance_connected_success` / `instance_connection_failed`

Backend (posthog-node) :
- [ ] `user_registered_complete` (avec posthog.identify)
- [ ] `payment_completed` / `payment_failed`
- [ ] `subscription_activated`
- [ ] `instance_disconnected_by_provider`
- [ ] `bot_first_message_handled`
- [ ] `trial_expired_without_conversion`

### Phase 2 : Feature Adoption (Semaine 2)
- [ ] Bot configuration
- [ ] Campaigns
- [ ] Referral

### Phase 3 : Advanced Analytics (Semaine 3)
- [ ] Erreurs & performance
- [ ] Retention cohorts
- [ ] Revenue dashboards

---

## 📝 Template de Code Réutilisable

> ⚠️ **RÈGLE D'OR — Frontend vs Backend**
>
> - `posthog-js` (navigateur) : pour les événements UI (clics, navigation, formulaires)
> - `posthog-node` (backend) : **OBLIGATOIRE** pour les événements critiques business
>
> Événements qui DOIVENT passer par `posthog-node` :
> - `user_registered_complete`
> - `payment_completed` / `payment_failed`
> - `subscription_activated` / `subscription_cancelled`
> - `bot_first_message_handled`
> - `bot_response_no_context_found`
> - `instance_disconnected_by_provider`
> - `trial_message_quota_reached`
> - `trial_expired_without_conversion`
>
> **Raison** : si l'utilisateur ferme son navigateur au moment du paiement ou de l'inscription, l'événement côté client est perdu. Le backend ne ferme jamais la page.

```typescript
// frontend/lib/analytics.ts
import posthog from 'posthog-js'

export const analytics = {
  // Auth
  trackRegistrationStarted: (source: string, referralCode?: string) => {
    posthog.capture('user_registration_started', { source, referral_code: referralCode || null })
  },

  trackOTPRequested: (phoneCountryCode: string, isRetry: boolean) => {
    posthog.capture('otp_requested', { phone_country_code: phoneCountryCode, is_retry: isRetry })
  },

  // Instances
  trackInstanceCreated: (instanceName: string, method: 'pairing_code' | 'qr_code', isFirst: boolean) => {
    posthog.capture('instance_created_success', {
      instance_name: instanceName,
      connection_method: method,
      is_first_instance: isFirst
    })
  },

  // Campaigns
  trackCampaignCreated: (campaign: Campaign) => {
    posthog.capture('campaign_created_success', {
      instance_name: campaign.instanceName,
      recipients_count: campaign.totalCount,
      has_media: !!campaign.mediaUrl,
      message_length_chars: campaign.message.length
    })
  },

  // User identification
  identifyUser: (user: User) => {
    const isLikelyAgency = user.instances.length >= 2
    posthog.identify(user.id, {
      phone: user.phone,
      plan: user.subscription?.plan || 'free',
      instances_count: user.instances.length,
      wallet_balance: user.walletBalance,
      created_at: user.createdAt,
      user_type: isLikelyAgency ? 'agency' : 'solopreneur' // heuristique provisoire
    })
  }
}
```

---

## ✅ Checklist de Validation

Avant de lancer une feature :
- [ ] Tous les événements clés sont trackés
- [ ] Dashboard PostHog créé pour monitorer
- [ ] Objectifs/KPIs définis (ex: "50% d'adoption en 30 jours")
- [ ] Plan d'action si objectifs non atteints

Avant de prendre une décision :
- [ ] Données sur au moins 100 users (significativité statistique)
- [ ] Segmentation par plan/pays/source (éviter les biais)
- [ ] Comparaison avec baseline (avant/après)
- [ ] Validation qualitative (interviews users si besoin)

---

**Principe** : "In God we trust, all others must bring data." — W. Edwards Deming
