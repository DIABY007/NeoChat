const axios = require('axios');

async function testRateLimiter() {
  console.log('=== Test du Rate Limiter BullMQ ===\n');
  console.log('Envoi de 3 messages simultanés pour la même instance...\n');
  
  const startTime = Date.now();
  
  try {
    const response = await axios.post('http://localhost:3001/api/test/test-multiple-jobs', {
      instanceName: 'RateLimitTest_Instance',
      count: 3
    });
    
    console.log('✅ Jobs ajoutés à la queue:', response.data.jobs.length);
    console.log('\nAttente de 16 secondes pour observer le traitement...\n');
    
    await new Promise(resolve => setTimeout(resolve, 16000));
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.log(`\n✅ Test terminé en ${totalTime.toFixed(1)} secondes`);
    console.log('\nThéorie:');
    console.log('- Message 1: Traité immédiatement (0s)');
    console.log('- Message 2: Traité après 5s (délai anti-ban)');
    console.log('- Message 3: Traité après 10s (délai anti-ban)');
    console.log('\nVérifiez les logs du serveur pour confirmer les délais.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testRateLimiter();
