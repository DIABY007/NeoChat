import posthog from 'posthog-js'

let posthogInitialized = false

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (posthogInitialized) return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) {
    console.warn('[PostHog] NEXT_PUBLIC_POSTHOG_KEY is missing — tracking disabled')
    return
  }
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    capture_heatmaps: true,
    persistence: 'localStorage',
    loaded: (ph) => {
      console.log('[PostHog] ✅ SDK loaded, distinct_id:', ph.get_distinct_id())
      console.log('[PostHog] autocapture: true, heatmaps: true, pageview: true')
    },
  })
  posthogInitialized = true
  console.log('[PostHog] init() called with key:', key.slice(0, 10) + '...', 'host:', process.env.NEXT_PUBLIC_POSTHOG_HOST)
}

export const analytics = {

  // --- AUTH ---
  trackRegistrationStarted: (source: 'landing_page' | 'pricing_page' | 'referral_link', referralCode?: string) => {
    posthog.capture('user_registration_started', { source, referral_code: referralCode || null })
  },

  trackOTPRequested: (phoneCountryCode: string, isRetry: boolean) => {
    posthog.capture('otp_requested', { phone_country_code: phoneCountryCode, is_retry: isRetry })
  },

  trackOTPVerifiedSuccess: (phoneCountryCode: string, attemptCount: number, timeElapsed: number) => {
    posthog.capture('otp_verified_success', {
      phone_country_code: phoneCountryCode,
      attempts_count: attemptCount,
      time_to_verify_seconds: timeElapsed
    })
  },

  trackOTPVerificationFailed: (phoneCountryCode: string, errorType: 'expired' | 'invalid_code' | 'max_attempts', attemptCount: number) => {
    posthog.capture('otp_verification_failed', {
      phone_country_code: phoneCountryCode,
      error_type: errorType,
      attempts_count: attemptCount
    })
  },

  identifyUser: (user: { id: string; phone: string; referralCode: string; referredBy?: string | null; createdAt?: string; subscription?: { plan?: string; status?: string } | null; instances?: any[]; walletBalance: number }) => {
    const instancesCount = user.instances?.length || 0
    const isLikelyAgency = instancesCount >= 2
    posthog.identify(user.id, {
      phone: user.phone,
      country_code: user.phone.slice(0, 3),
      referral_code: user.referralCode,
      referred_by: user.referredBy || null,
      created_at: user.createdAt || null,
      plan: user.subscription?.plan || user.subscription?.status || 'free',
      instances_count: instancesCount,
      wallet_balance: user.walletBalance,
      user_type: isLikelyAgency ? 'agency' : 'solopreneur'
    })
  },

  // --- INSTANCES ---
  trackInstanceCreationStarted: (method: 'pairing_code' | 'qr_code', currentCount: number) => {
    posthog.capture('instance_creation_started', {
      connection_method: method,
      instances_count_before: currentCount
    })
  },

  trackInstanceCreatedSuccess: (instanceName: string, method: 'pairing_code' | 'qr_code', phoneCountryCode: string, isFirst: boolean, timeElapsed: number) => {
    posthog.capture('instance_created_success', {
      instance_name: instanceName,
      connection_method: method,
      phone_country_code: phoneCountryCode,
      is_first_instance: isFirst,
      time_to_create_seconds: timeElapsed
    })
  },

  trackPairingCodeGenerated: (instanceName: string, isManualRefresh: boolean, attemptNumber: number) => {
    posthog.capture('pairing_code_generated', {
      instance_name: instanceName,
      is_manual_refresh: isManualRefresh,
      code_generation_attempt: attemptNumber
    })
  },

  trackPairingCodeCopied: (instanceName: string, timeLeft: number) => {
    posthog.capture('pairing_code_copied', { instance_name: instanceName, time_left_seconds: timeLeft })
  },

  trackInstanceConnectedSuccess: (instanceName: string, method: 'pairing_code' | 'qr_code', timeElapsed: number, refreshCount: number, isFirst: boolean) => {
    posthog.capture('instance_connected_success', {
      instance_name: instanceName,
      connection_method: method,
      time_to_connect_seconds: timeElapsed,
      pairing_code_refreshes_count: refreshCount,
      is_first_instance: isFirst
    })
  },

  trackInstanceConnectionFailed: (instanceName: string, method: 'pairing_code' | 'qr_code', errorType: 'timeout' | 'invalid_code' | 'api_error', timeElapsed: number) => {
    posthog.capture('instance_connection_failed', {
      instance_name: instanceName,
      connection_method: method,
      error_type: errorType,
      time_spent_seconds: timeElapsed
    })
  },

  trackInstanceDeleted: (instanceName: string, wasConnected: boolean, ageDays: number, reason: 'user_action' | 'error_cleanup' = 'user_action') => {
    posthog.capture('instance_deleted', {
      instance_name: instanceName,
      was_connected: wasConnected,
      instance_age_days: ageDays,
      reason
    })
  },

  trackInstanceDisconnectedByProvider: (instanceName: string, reasonCode: string) => {
    posthog.capture('instance_disconnected_by_provider', {
      instance_name: instanceName,
      reason_code: reasonCode,
      downtime_started_at: new Date().toISOString(),
    })
  },

  // AJOUT 9
  trackInstanceReconnected: (instanceName: string, wasDisconnectedByProvider: boolean, downtimeMinutes: number, method: 'pairing_code' | 'qr_code') => {
    posthog.capture('instance_reconnected', {
      instance_name: instanceName,
      was_disconnected_by_provider: wasDisconnectedByProvider,
      downtime_minutes: downtimeMinutes,
      reconnection_method: method
    })
  },

  // --- BOT ---
  trackBotActivated: (instanceName: string, hasCustomPrompt: boolean, docsCount: number, hoursSinceCreation: number) => {
    posthog.capture('bot_activated', {
      instance_name: instanceName,
      has_custom_prompt: hasCustomPrompt,
      knowledge_docs_count: docsCount,
      time_since_instance_created_hours: hoursSinceCreation
    })
  },

  trackBotDeactivated: (instanceName: string, hoursActive: number, messagesCount: number, docsCount: number = 0, noContextResponsesCount: number = 0) => {
    posthog.capture('bot_deactivated', {
      instance_name: instanceName,
      was_active_for_hours: hoursActive,
      messages_handled_count: messagesCount,
      no_context_responses_count: noContextResponsesCount,
      had_knowledge_docs: docsCount > 0,
      docs_count: docsCount
    })
  },

  trackBotPromptUpdated: (instanceName: string, promptLength: number, isFirstCustomization: boolean) => {
    posthog.capture('bot_prompt_updated', {
      instance_name: instanceName,
      prompt_length_chars: promptLength,
      is_first_customization: isFirstCustomization
    })
  },

  trackKnowledgeDocumentAdded: (instanceName: string, docType: 'text' | 'pdf', sizeKB: number, totalDocs: number) => {
    posthog.capture('knowledge_document_added', {
      instance_name: instanceName,
      document_type: docType,
      document_size_kb: sizeKB,
      total_docs_count: totalDocs
    })
  },

  trackBlacklistContactAdded: (instanceName: string, blacklistCount: number) => {
    posthog.capture('blacklist_contact_added', { instance_name: instanceName, blacklist_size: blacklistCount })
  },

  // --- CAMPAGNES ---
  trackCampaignCreationStarted: (instanceName: string, campaignsCount: number) => {
    posthog.capture('campaign_creation_started', {
      instance_name: instanceName,
      campaigns_count_before: campaignsCount
    })
  },

  trackCampaignCreatedSuccess: (campaign: { instanceName: string; totalCount: number; mediaUrl?: string; mediaType?: string; scheduledAt?: Date; message: string }) => {
    posthog.capture('campaign_created_success', {
      instance_name: campaign.instanceName,
      recipients_count: campaign.totalCount,
      has_media: !!campaign.mediaUrl,
      media_type: campaign.mediaType || null,
      is_scheduled: campaign.scheduledAt ? campaign.scheduledAt > new Date() : false,
      message_length_chars: campaign.message.length
    })
  },

  // --- REFERRAL ---
  trackReferralLinkCopied: (referralCode: string, referralsCount: number, walletBalance: number) => {
    posthog.capture('referral_link_copied', {
      referral_code: referralCode,
      referrals_count: referralsCount,
      wallet_balance: walletBalance
    })
  },

  trackWalletWithdrawalRequested: (amount: number, paymentMethod: string, balanceBefore: number) => {
    posthog.capture('wallet_withdrawal_requested', {
      amount,
      payment_method: paymentMethod,
      wallet_balance_before: balanceBefore
    })
  },

  // --- FEATURE DISCOVERY ---
  trackFeatureDiscovered: (featureName: 'bot_config' | 'campaign' | 'blacklist' | 'knowledge_base', daysSinceRegistration: number) => {
    posthog.capture('feature_discovered', {
      feature_name: featureName,
      days_since_registration: daysSinceRegistration
    })
  },

  trackCheckoutStarted: (plan: string, hasReferral: boolean) => {
    posthog.capture('checkout_started', { plan, has_referral: hasReferral })
  },

  trackPlanUpgradeClicked: (currentPlan: string, targetPlan: string, location: string) => {
    posthog.capture('plan_upgrade_clicked', {
      current_plan: currentPlan,
      target_plan: targetPlan,
      trigger_location: location
    })
  },
}
