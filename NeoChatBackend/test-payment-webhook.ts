import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5000';

interface WebhookTestCase {
  name: string;
  payload: {
    cart_id: string;
    status: string;
    amount: number;
    metadata?: {
      plan?: string;
      userId?: string;
    };
  };
}

const testCases: WebhookTestCase[] = [
  {
    name: '✅ Test paiement validé (status: paid)',
    payload: {
      cart_id: 'test_cart_123',
      status: 'paid',
      amount: 5000,
      metadata: {
        plan: 'ASSISTANT',
        userId: 'test_user_id',
      },
    },
  },
  {
    name: '✅ Test paiement validé (status: completed)',
    payload: {
      cart_id: 'test_cart_456',
      status: 'completed',
      amount: 10000,
      metadata: {
        plan: 'DIFFUSION',
      },
    },
  },
  {
    name: '✅ Test paiement validé (status: success)',
    payload: {
      cart_id: 'test_cart_789',
      status: 'success',
      amount: 15000,
      metadata: {
        plan: 'PREMIUM',
      },
    },
  },
  {
    name: '❌ Test paiement échoué (status: failed)',
    payload: {
      cart_id: 'test_cart_fail_1',
      status: 'failed',
      amount: 5000,
    },
  },
  {
    name: '❌ Test paiement annulé (status: cancelled)',
    payload: {
      cart_id: 'test_cart_cancel_1',
      status: 'cancelled',
      amount: 10000,
    },
  },
];

async function testWebhook(testCase: WebhookTestCase) {
  console.log('\n' + '='.repeat(60));
  console.log(testCase.name);
  console.log('='.repeat(60));
  console.log('Payload:', JSON.stringify(testCase.payload, null, 2));

  try {
    const response = await axios.post(
      `${API_URL}/api/payments/webhook`,
      testCase.payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n✅ Réponse du serveur:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('\n❌ Erreur:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Message:', error.message);
    }
  }
}

async function runTests() {
  console.log('\n🧪 TESTS DES WEBHOOKS DE PAIEMENT');
  console.log('API URL:', API_URL);
  console.log('\nCes tests vont simuler des webhooks de Maketou');
  console.log('et vérifier que les messages WhatsApp sont bien envoyés.\n');

  for (const testCase of testCases) {
    await testWebhook(testCase);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 TESTS TERMINÉS');
  console.log('='.repeat(60));
  console.log('\n📝 Vérifications à faire:');
  console.log('1. Consulter les logs du serveur pour voir les tentatives d\'envoi de messages');
  console.log('2. Vérifier que les messages WhatsApp ont été envoyés (si une instance est connectée)');
  console.log('3. Vérifier que les abonnements ont été mis à jour dans la base de données');
  console.log('\n💡 Note: Pour que les messages soient réellement envoyés,');
  console.log('   il faut qu\'une instance WhatsApp soit connectée et configurée.');
}

runTests().catch(console.error);
