/**
 * Script de vérification finale des paiements avant déploiement
 * 
 * Ce script simule des webhooks Maketou pour chaque formule (ASSISTANT, DIFFUSION, PREMIUM)
 * et vérifie que le statut de l'abonnement se met à jour correctement en BDD.
 * 
 * Usage: npx ts-node src/tests/verify-payments.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://localhost:3001';

const PLANS = [
  { name: 'ASSISTANT', price: 7500, description: 'Assistant IA' },
  { name: 'DIFFUSION', price: 5000, description: 'Diffusion' },
  { name: 'PREMIUM', price: 10000, description: 'Premium' },
];

interface TestResult {
  plan: string;
  webhookStatus: string;
  dbStatusBefore: string;
  dbStatusAfter: string;
  nextBillingAt: string | null;
  messageCountReset: boolean;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];
const createdUserIds: string[] = [];
const createdSubscriptionIds: string[] = [];

async function createTestUser(suffix: string) {
  const phone = `+225TEST_PAY_${suffix}_${Date.now()}`;
  const referralCode = `TPAY_${suffix}_${Date.now()}`;

  const user = await prisma.user.create({
    data: {
      phone,
      firstName: 'TestPay',
      lastName: suffix,
      referralCode,
      subscription: {
        create: {
          status: 'TRIAL',
          messageCount: 5,
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    },
    include: { subscription: true },
  });

  createdUserIds.push(user.id);
  if (user.subscription) {
    createdSubscriptionIds.push(user.subscription.id);
  }

  return user;
}

async function callWebhook(cartId: string, status: string, amount: number, plan: string): Promise<{ httpStatus: number; body: any }> {
  const response = await fetch(`${API_URL}/api/payment/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cart_id: cartId,
      status,
      amount,
      metadata: { plan },
    }),
  });

  return {
    httpStatus: response.status,
    body: await response.json() as any,
  };
}

// ────────────────────────────────────────────────────────
// TEST 1 : Paiement réussi pour chaque formule
// ────────────────────────────────────────────────────────
async function testSuccessfulPayments() {
  console.log('\n' + '═'.repeat(70));
  console.log('  TEST 1 : PAIEMENT RÉUSSI POUR CHAQUE FORMULE');
  console.log('═'.repeat(70));

  for (const plan of PLANS) {
    const cartId = `verify_${plan.name.toLowerCase()}_${Date.now()}`;
    console.log(`\n── ${plan.description} (${plan.name}) ──`);

    try {
      // Créer un utilisateur de test
      const user = await createTestUser(plan.name);
      console.log(`  ✓ Utilisateur créé: ${user.phone}`);

      // Associer le cartId à la subscription
      await prisma.subscription.update({
        where: { id: user.subscription!.id },
        data: { maketouCartId: cartId },
      });
      console.log(`  ✓ CartId associé: ${cartId}`);

      // Vérifier le statut AVANT
      const subBefore = await prisma.subscription.findUnique({
        where: { id: user.subscription!.id },
      });
      console.log(`  ✓ Statut AVANT webhook: ${subBefore?.status}`);

      // Appeler le webhook (status=paid)
      const webhookRes = await callWebhook(cartId, 'paid', plan.price, plan.name);
      console.log(`  ✓ Webhook appelé → HTTP ${webhookRes.httpStatus} : ${webhookRes.body.message}`);

      // Vérifier le statut APRÈS
      const subAfter = await prisma.subscription.findUnique({
        where: { id: user.subscription!.id },
      });

      const passed =
        subAfter?.status === plan.name &&
        subAfter?.messageCount === 0 &&
        subAfter?.nextBillingAt !== null;

      results.push({
        plan: plan.name,
        webhookStatus: `${webhookRes.httpStatus} - ${webhookRes.body.message}`,
        dbStatusBefore: subBefore?.status || 'N/A',
        dbStatusAfter: subAfter?.status || 'N/A',
        nextBillingAt: subAfter?.nextBillingAt?.toISOString() || null,
        messageCountReset: subAfter?.messageCount === 0,
        passed,
      });

      if (passed) {
        console.log(`  ✅ PASS : Statut mis à jour → ${subAfter?.status}, messageCount=0, nextBillingAt défini`);
      } else {
        console.log(`  ❌ FAIL : Statut=${subAfter?.status}, messageCount=${subAfter?.messageCount}, nextBillingAt=${subAfter?.nextBillingAt}`);
      }
    } catch (error: any) {
      console.log(`  ❌ ERREUR : ${error.message}`);
      results.push({
        plan: plan.name,
        webhookStatus: 'ERROR',
        dbStatusBefore: 'N/A',
        dbStatusAfter: 'N/A',
        nextBillingAt: null,
        messageCountReset: false,
        passed: false,
        error: error.message,
      });
    }
  }
}

// ────────────────────────────────────────────────────────
// TEST 2 : Statuts webhook alternatifs (completed, success)
// ────────────────────────────────────────────────────────
async function testAlternativeStatuses() {
  console.log('\n' + '═'.repeat(70));
  console.log('  TEST 2 : STATUTS WEBHOOK ALTERNATIFS (completed, success)');
  console.log('═'.repeat(70));

  const altStatuses = ['completed', 'success'];

  for (const webhookStatus of altStatuses) {
    const cartId = `verify_alt_${webhookStatus}_${Date.now()}`;
    console.log(`\n── Webhook status="${webhookStatus}" → Plan PREMIUM ──`);

    try {
      const user = await createTestUser(`ALT_${webhookStatus}`);

      await prisma.subscription.update({
        where: { id: user.subscription!.id },
        data: { maketouCartId: cartId },
      });

      const webhookRes = await callWebhook(cartId, webhookStatus, 10000, 'PREMIUM');
      console.log(`  ✓ Webhook status="${webhookStatus}" → HTTP ${webhookRes.httpStatus}`);

      const subAfter = await prisma.subscription.findUnique({
        where: { id: user.subscription!.id },
      });

      const passed = subAfter?.status === 'PREMIUM' && subAfter?.messageCount === 0;

      results.push({
        plan: `PREMIUM (via ${webhookStatus})`,
        webhookStatus: `${webhookRes.httpStatus} - ${webhookRes.body.message}`,
        dbStatusBefore: 'FREE',
        dbStatusAfter: subAfter?.status || 'N/A',
        nextBillingAt: subAfter?.nextBillingAt?.toISOString() || null,
        messageCountReset: subAfter?.messageCount === 0,
        passed,
      });

      console.log(passed ? `  ✅ PASS` : `  ❌ FAIL : status=${subAfter?.status}`);
    } catch (error: any) {
      console.log(`  ❌ ERREUR : ${error.message}`);
      results.push({
        plan: `PREMIUM (via ${webhookStatus})`,
        webhookStatus: 'ERROR',
        dbStatusBefore: 'N/A',
        dbStatusAfter: 'N/A',
        nextBillingAt: null,
        messageCountReset: false,
        passed: false,
        error: error.message,
      });
    }
  }
}

// ────────────────────────────────────────────────────────
// TEST 3 : Paiement échoué / annulé
// ────────────────────────────────────────────────────────
async function testFailedPayments() {
  console.log('\n' + '═'.repeat(70));
  console.log('  TEST 3 : PAIEMENT ÉCHOUÉ / ANNULÉ');
  console.log('═'.repeat(70));

  const failStatuses = ['failed', 'cancelled'];

  for (const failStatus of failStatuses) {
    const cartId = `verify_fail_${failStatus}_${Date.now()}`;
    console.log(`\n── Webhook status="${failStatus}" ──`);

    try {
      const user = await createTestUser(`FAIL_${failStatus}`);

      await prisma.subscription.update({
        where: { id: user.subscription!.id },
        data: { maketouCartId: cartId },
      });

      const subBefore = await prisma.subscription.findUnique({
        where: { id: user.subscription!.id },
      });

      const webhookRes = await callWebhook(cartId, failStatus, 5000, 'ASSISTANT');
      console.log(`  ✓ Webhook status="${failStatus}" → HTTP ${webhookRes.httpStatus}`);

      const subAfter = await prisma.subscription.findUnique({
        where: { id: user.subscription!.id },
      });

      // Le statut ne doit PAS changer vers un plan payant
      const passed = subAfter?.status === subBefore?.status;

      results.push({
        plan: `${failStatus.toUpperCase()} (ne doit pas changer)`,
        webhookStatus: `${webhookRes.httpStatus} - ${webhookRes.body.message}`,
        dbStatusBefore: subBefore?.status || 'N/A',
        dbStatusAfter: subAfter?.status || 'N/A',
        nextBillingAt: subAfter?.nextBillingAt?.toISOString() || null,
        messageCountReset: false,
        passed,
      });

      console.log(passed
        ? `  ✅ PASS : Statut inchangé (${subAfter?.status})`
        : `  ❌ FAIL : Statut changé de ${subBefore?.status} → ${subAfter?.status}`
      );
    } catch (error: any) {
      console.log(`  ❌ ERREUR : ${error.message}`);
      results.push({
        plan: `${failStatus.toUpperCase()} (ne doit pas changer)`,
        webhookStatus: 'ERROR',
        dbStatusBefore: 'N/A',
        dbStatusAfter: 'N/A',
        nextBillingAt: null,
        messageCountReset: false,
        passed: false,
        error: error.message,
      });
    }
  }
}

// ────────────────────────────────────────────────────────
// TEST 4 : Commission de parrainage
// ────────────────────────────────────────────────────────
async function testReferralCommission() {
  console.log('\n' + '═'.repeat(70));
  console.log('  TEST 4 : COMMISSION DE PARRAINAGE (20%)');
  console.log('═'.repeat(70));

  try {
    // Créer le parrain
    const referrerCode = `REF_VERIFY_${Date.now()}`;
    const referrer = await prisma.user.create({
      data: {
        phone: `+225REF_VERIFY_${Date.now()}`,
        firstName: 'Parrain',
        lastName: 'Test',
        referralCode: referrerCode,
        walletBalance: 0,
        subscription: {
          create: {
            status: 'PREMIUM',
            messageCount: 0,
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: { subscription: true },
    });
    createdUserIds.push(referrer.id);
    if (referrer.subscription) createdSubscriptionIds.push(referrer.subscription.id);
    console.log(`  ✓ Parrain créé: ${referrer.phone} (code: ${referrerCode})`);

    // Créer le filleul (referredBy = parrain)
    const cartId = `verify_referral_${Date.now()}`;
    const referred = await prisma.user.create({
      data: {
        phone: `+225REFERRED_VERIFY_${Date.now()}`,
        firstName: 'Filleul',
        lastName: 'Test',
        referralCode: `FILLEUL_${Date.now()}`,
        referredBy: referrerCode,
        subscription: {
          create: {
            status: 'TRIAL',
            messageCount: 0,
            maketouCartId: cartId,
            trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: { subscription: true },
    });
    createdUserIds.push(referred.id);
    if (referred.subscription) createdSubscriptionIds.push(referred.subscription.id);
    console.log(`  ✓ Filleul créé: ${referred.phone} (referredBy: ${referrerCode})`);

    // Appeler le webhook
    const amount = 10000;
    const webhookRes = await callWebhook(cartId, 'paid', amount, 'PREMIUM');
    console.log(`  ✓ Webhook appelé → HTTP ${webhookRes.httpStatus}`);

    // Vérifier la commission
    const expectedCommission = Math.floor(amount * 0.20); // 2000 FCFA
    const updatedReferrer = await prisma.user.findUnique({
      where: { id: referrer.id },
    });

    const commissionPassed = updatedReferrer?.walletBalance === expectedCommission;

    // Vérifier l'enregistrement AffiliatePayment
    const affiliatePayment = await prisma.affiliatePayment.findFirst({
      where: { userId: referrer.id },
      orderBy: { createdAt: 'desc' },
    });

    const affiliatePassed = affiliatePayment !== null && affiliatePayment.amount === expectedCommission;

    const passed = commissionPassed && affiliatePassed;

    console.log(`  Balance parrain: ${updatedReferrer?.walletBalance} FCFA (attendu: ${expectedCommission} FCFA)`);
    console.log(`  AffiliatePayment créé: ${affiliatePayment ? 'OUI' : 'NON'} (montant: ${affiliatePayment?.amount || 0})`);

    results.push({
      plan: 'REFERRAL COMMISSION',
      webhookStatus: `${webhookRes.httpStatus} - Commission ${expectedCommission} FCFA`,
      dbStatusBefore: '0 FCFA',
      dbStatusAfter: `${updatedReferrer?.walletBalance} FCFA`,
      nextBillingAt: null,
      messageCountReset: false,
      passed,
    });

    console.log(passed
      ? `  ✅ PASS : Commission de ${expectedCommission} FCFA correctement créditée`
      : `  ❌ FAIL : Commission incorrecte`
    );

    // Nettoyage AffiliatePayment
    if (affiliatePayment) {
      await prisma.affiliatePayment.delete({ where: { id: affiliatePayment.id } });
    }
  } catch (error: any) {
    console.log(`  ❌ ERREUR : ${error.message}`);
    results.push({
      plan: 'REFERRAL COMMISSION',
      webhookStatus: 'ERROR',
      dbStatusBefore: 'N/A',
      dbStatusAfter: 'N/A',
      nextBillingAt: null,
      messageCountReset: false,
      passed: false,
      error: error.message,
    });
  }
}

// ────────────────────────────────────────────────────────
// TEST 5 : Cas d'erreur (cart_id manquant, inexistant)
// ────────────────────────────────────────────────────────
async function testErrorCases() {
  console.log('\n' + '═'.repeat(70));
  console.log('  TEST 5 : CAS D\'ERREUR');
  console.log('═'.repeat(70));

  // Test sans cart_id
  console.log('\n── cart_id manquant ──');
  try {
    const res = await fetch(`${API_URL}/api/payment/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid', amount: 5000 }),
    });
    const body = await res.json();
    const passed = res.status === 400;
    console.log(`  HTTP ${res.status} → ${passed ? '✅ PASS' : '❌ FAIL'} (attendu: 400)`);
    results.push({
      plan: 'ERREUR: cart_id manquant',
      webhookStatus: `${res.status}`,
      dbStatusBefore: 'N/A',
      dbStatusAfter: 'N/A',
      nextBillingAt: null,
      messageCountReset: false,
      passed,
    });
  } catch (error: any) {
    console.log(`  ❌ ERREUR : ${error.message}`);
  }

  // Test avec cart_id inexistant
  console.log('\n── cart_id inexistant ──');
  try {
    const res = await fetch(`${API_URL}/api/payment/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart_id: 'INEXISTANT_123', status: 'paid', amount: 5000 }),
    });
    const body = await res.json();
    const passed = res.status === 404;
    console.log(`  HTTP ${res.status} → ${passed ? '✅ PASS' : '❌ FAIL'} (attendu: 404)`);
    results.push({
      plan: 'ERREUR: cart_id inexistant',
      webhookStatus: `${res.status}`,
      dbStatusBefore: 'N/A',
      dbStatusAfter: 'N/A',
      nextBillingAt: null,
      messageCountReset: false,
      passed,
    });
  } catch (error: any) {
    console.log(`  ❌ ERREUR : ${error.message}`);
  }
}

// ────────────────────────────────────────────────────────
// NETTOYAGE
// ────────────────────────────────────────────────────────
async function cleanup() {
  console.log('\n' + '═'.repeat(70));
  console.log('  NETTOYAGE DES DONNÉES DE TEST');
  console.log('═'.repeat(70));

  try {
    // Supprimer les subscriptions d'abord (contrainte FK)
    for (const subId of createdSubscriptionIds) {
      try {
        await prisma.subscription.delete({ where: { id: subId } });
      } catch (e) {
        // Ignore si déjà supprimé
      }
    }

    // Supprimer les utilisateurs
    for (const userId of createdUserIds) {
      try {
        // Supprimer d'abord les subscriptions restantes
        await prisma.subscription.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
      } catch (e) {
        // Ignore si déjà supprimé
      }
    }

    console.log(`  ✓ ${createdUserIds.length} utilisateurs de test nettoyés`);
  } catch (error: any) {
    console.log(`  ⚠️  Erreur lors du nettoyage: ${error.message}`);
  }
}

// ────────────────────────────────────────────────────────
// RAPPORT FINAL
// ────────────────────────────────────────────────────────
function printReport() {
  console.log('\n' + '═'.repeat(70));
  console.log('  RAPPORT DE VÉRIFICATION DES PAIEMENTS');
  console.log('═'.repeat(70));

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`\n  Total: ${totalTests} tests | ✅ ${passedTests} passés | ❌ ${failedTests} échoués\n`);

  console.log('  ' + '─'.repeat(66));
  console.log(`  ${'Test'.padEnd(35)} ${'Avant'.padEnd(10)} ${'Après'.padEnd(10)} ${'Résultat'.padEnd(8)}`);
  console.log('  ' + '─'.repeat(66));

  for (const r of results) {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${r.plan.padEnd(35)} ${r.dbStatusBefore.padEnd(10)} ${r.dbStatusAfter.padEnd(10)} ${status}`);
  }

  console.log('  ' + '─'.repeat(66));
  console.log('');

  if (failedTests === 0) {
    console.log('  🎉 TOUS LES TESTS SONT PASSÉS — PRÊT POUR LE DÉPLOIEMENT !');
  } else {
    console.log(`  ⚠️  ${failedTests} TEST(S) EN ÉCHEC — À CORRIGER AVANT DÉPLOIEMENT`);
  }

  console.log('\n' + '═'.repeat(70));
}

// ────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────
async function main() {
  console.log('═'.repeat(70));
  console.log('  VÉRIFICATION FINALE DES PAIEMENTS — NEOCHAT');
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log(`  API: ${API_URL}`);
  console.log('═'.repeat(70));

  try {
    await testSuccessfulPayments();
    await testAlternativeStatuses();
    await testFailedPayments();
    await testReferralCommission();
    await testErrorCases();
  } catch (error: any) {
    console.error('\n❌ Erreur fatale:', error.message);
  } finally {
    await cleanup();
    printReport();
    await prisma.$disconnect();
  }
}

main();
