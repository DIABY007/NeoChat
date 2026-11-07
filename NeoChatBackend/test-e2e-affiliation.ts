import axios from 'axios';
import prisma from './src/config/prisma';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const REFERRAL_CODE = 'NEOGOOD2026';

interface TestUser {
  phone: string;
  name: string;
  plan: 'ASSISTANT' | 'DIFFUSION' | 'PREMIUM';
  userId?: string;
  cartId?: string;
  token?: string;
}

const testUsers: TestUser[] = [
  { phone: '+22656000001', name: 'Test Assistant', plan: 'ASSISTANT' },
  { phone: '+22656000002', name: 'Test Diffusion', plan: 'DIFFUSION' },
  { phone: '+22656000003', name: 'Test Premium', plan: 'PREMIUM' },
];

async function cleanupTestUsers() {
  console.log('\n🧹 Nettoyage des utilisateurs de test existants...');
  
  for (const testUser of testUsers) {
    try {
      const user = await prisma.user.findUnique({
        where: { phone: testUser.phone },
        include: { subscription: true },
      });
      
      if (user) {
        if (user.subscription) {
          await prisma.subscription.delete({ where: { id: user.subscription.id } });
        }
        await prisma.user.delete({ where: { id: user.id } });
        console.log(`✅ Utilisateur ${testUser.phone} supprimé`);
      }
    } catch (error) {
      console.log(`⚠️  Utilisateur ${testUser.phone} n'existe pas`);
    }
  }
}

async function createTestUsers() {
  console.log('\n📝 Création des 3 utilisateurs de test avec code parrain NEOGOOD2026...');
  
  for (const testUser of testUsers) {
    try {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);
      
      const user = await prisma.user.create({
        data: {
          phone: testUser.phone,
          lastName: testUser.name,
          referralCode: `TEST${Date.now()}${Math.random().toString(36).substring(7)}`,
          referredBy: REFERRAL_CODE,
          subscription: {
            create: {
              status: 'TRIAL',
              messageCount: 0,
              trialEndsAt: trialEndDate,
            },
          },
        },
        include: { subscription: true },
      });
      
      testUser.userId = user.id;
      testUser.cartId = `test_cart_${Date.now()}_${testUser.plan}`;
      
      await prisma.subscription.update({
        where: { id: user.subscription!.id },
        data: { maketouCartId: testUser.cartId },
      });
      
      console.log(`✅ ${testUser.name} créé (${testUser.phone})`);
      console.log(`   - User ID: ${user.id}`);
      console.log(`   - Cart ID: ${testUser.cartId}`);
      console.log(`   - Code parrain: ${REFERRAL_CODE}`);
    } catch (error: any) {
      console.error(`❌ Erreur création ${testUser.name}:`, error.message);
      throw error;
    }
  }
}

async function simulatePayments() {
  console.log('\n💳 Simulation des 3 paiements Maketou...');
  
  for (const testUser of testUsers) {
    try {
      const webhookPayload = {
        cart_id: testUser.cartId,
        status: 'paid',
        amount: testUser.plan === 'ASSISTANT' ? 5000 : testUser.plan === 'DIFFUSION' ? 10000 : 15000,
        metadata: {
          plan: testUser.plan,
          userId: testUser.userId,
        },
      };
      
      console.log(`\n📤 Envoi webhook pour ${testUser.name} (${testUser.plan})...`);
      
      const response = await axios.post(
        `${API_URL}/api/payment/webhook`,
        webhookPayload,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      if (response.data.success) {
        console.log(`✅ Paiement ${testUser.plan} validé pour ${testUser.name}`);
      } else {
        console.error(`❌ Échec paiement ${testUser.name}:`, response.data);
      }
    } catch (error: any) {
      console.error(`❌ Erreur webhook ${testUser.name}:`, error.response?.data || error.message);
      throw error;
    }
  }
}

async function verifySubscriptions() {
  console.log('\n🔍 Vérification des abonnements des 3 filleuls...');
  
  for (const testUser of testUsers) {
    try {
      const user = await prisma.user.findUnique({
        where: { phone: testUser.phone },
        include: { subscription: true },
      });
      
      if (!user || !user.subscription) {
        console.error(`❌ Utilisateur ${testUser.name} non trouvé`);
        continue;
      }
      
      const sub = user.subscription;
      const now = new Date();
      const endDate = new Date(sub.nextBillingAt || sub.trialEndsAt);
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`\n👤 ${testUser.name} (${testUser.phone}):`);
      console.log(`   ✓ Badge: ${sub.status}`);
      console.log(`   ✓ Jours restants: ${daysRemaining}`);
      console.log(`   ✓ Expire le: ${endDate.toISOString()}`);
      console.log(`   ✓ Message count: ${sub.messageCount}`);
      
      if (sub.status !== testUser.plan) {
        console.error(`   ❌ ERREUR: Badge attendu ${testUser.plan}, reçu ${sub.status}`);
      } else {
        console.log(`   ✅ Badge correct: ${testUser.plan}`);
      }
      
      if (daysRemaining < 29 || daysRemaining > 31) {
        console.error(`   ❌ ERREUR: Jours restants attendu ~30, reçu ${daysRemaining}`);
      } else {
        console.log(`   ✅ Expiration correcte: ${daysRemaining} jours`);
      }
    } catch (error: any) {
      console.error(`❌ Erreur vérification ${testUser.name}:`, error.message);
    }
  }
}

async function verifyReferrerWallet() {
  console.log('\n💰 Vérification de la cagnotte du parrain NEOGOOD2026...');
  
  try {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: REFERRAL_CODE },
    });
    
    if (!referrer) {
      console.error(`❌ Parrain ${REFERRAL_CODE} non trouvé`);
      return;
    }
    
    const COMMISSION_PER_SALE = 2000;
    const EXPECTED_TOTAL = COMMISSION_PER_SALE * 3;
    
    console.log(`\n👤 Parrain: ${referrer.phone || referrer.lastName || REFERRAL_CODE}`);
    console.log(`   💵 Cagnotte actuelle: ${referrer.walletBalance} FCFA`);
    console.log(`   💵 Commission attendue: ${EXPECTED_TOTAL} FCFA (3 x ${COMMISSION_PER_SALE})`);
    
    if (referrer.walletBalance >= EXPECTED_TOTAL) {
      console.log(`   ✅ Cagnotte correcte (>= ${EXPECTED_TOTAL} FCFA)`);
    } else {
      console.error(`   ❌ ERREUR: Cagnotte insuffisante`);
    }
  } catch (error: any) {
    console.error(`❌ Erreur vérification parrain:`, error.message);
  }
}

async function runE2ETest() {
  console.log('═'.repeat(70));
  console.log('🧪 TEST E2E - FLUX D\'AFFILIATION COMPLET');
  console.log('═'.repeat(70));
  
  try {
    await cleanupTestUsers();
    await createTestUsers();
    await simulatePayments();
    
    console.log('\n⏳ Attente de 2 secondes pour la propagation...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await verifySubscriptions();
    await verifyReferrerWallet();
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ TEST E2E TERMINÉ');
    console.log('═'.repeat(70));
    
  } catch (error: any) {
    console.error('\n❌ ERREUR CRITIQUE:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runE2ETest();
