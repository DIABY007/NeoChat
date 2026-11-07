const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function testWebhook(testName, payload) {
  console.log('\n' + '='.repeat(70));
  console.log(`🧪 ${testName}`);
  console.log('='.repeat(70));
  console.log('📤 Payload envoyé:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      `${API_URL}/api/payments/webhook`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n✅ Réponse du serveur:');
    console.log('   Status:', response.status);
    console.log('   Message:', response.data.message);
    console.log('   Success:', response.data.success);
    
    return true;
  } catch (error) {
    console.log('\n❌ Erreur:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data.error || error.response.data.message);
    } else {
      console.log('   Message:', error.message);
    }
    
    return false;
  }
}

async function runTests() {
  console.log('\n🚀 TEST DES NOTIFICATIONS DE PAIEMENT');
  console.log('API URL:', API_URL);
  console.log('\n⚠️  IMPORTANT:');
  console.log('   - Le serveur doit être démarré (npm run dev)');
  console.log('   - Remplacez "CART_ID_REEL" par un vrai cart_id de votre DB');
  console.log('   - Une instance WhatsApp doit être connectée pour recevoir les messages\n');

  const CART_ID = process.argv[2] || 'CART_ID_REEL';
  
  if (CART_ID === 'CART_ID_REEL') {
    console.log('⚠️  Vous devez fournir un cart_id réel:');
    console.log('   node test-webhook-simple.js VOTRE_CART_ID\n');
    console.log('💡 Pour trouver un cart_id, consultez votre base de données:');
    console.log('   SELECT maketouCartId FROM Subscription WHERE maketouCartId IS NOT NULL;\n');
    process.exit(1);
  }

  const tests = [
    {
      name: '✅ Test 1: Paiement VALIDÉ (status: paid)',
      payload: {
        cart_id: CART_ID,
        status: 'paid',
        amount: 5000,
        metadata: {
          plan: 'ASSISTANT',
        },
      },
    },
    {
      name: '❌ Test 2: Paiement ÉCHOUÉ (status: failed)',
      payload: {
        cart_id: CART_ID,
        status: 'failed',
        amount: 5000,
      },
    },
  ];

  console.log('📋 Tests à exécuter:', tests.length);
  console.log('🎯 Cart ID utilisé:', CART_ID);

  let successCount = 0;
  
  for (const test of tests) {
    const result = await testWebhook(test.name, test.payload);
    if (result) successCount++;
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('🏁 RÉSUMÉ DES TESTS');
  console.log('='.repeat(70));
  console.log(`✅ Tests réussis: ${successCount}/${tests.length}`);
  console.log(`❌ Tests échoués: ${tests.length - successCount}/${tests.length}`);
  
  console.log('\n📝 VÉRIFICATIONS À FAIRE:');
  console.log('   1. Consulter les logs du serveur backend');
  console.log('   2. Vérifier la réception des messages WhatsApp');
  console.log('   3. Vérifier la mise à jour de l\'abonnement dans la DB');
  console.log('');
  console.log('💡 Logs à rechercher dans le serveur:');
  console.log('   [Payment Webhook] ✅ Notification de paiement réussi envoyée');
  console.log('   [Payment Webhook] ✅ Notification d\'échec de paiement envoyée');
  console.log('');
}

runTests().catch(error => {
  console.error('\n💥 Erreur fatale:', error.message);
  process.exit(1);
});
