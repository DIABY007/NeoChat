import prisma from '../config/prisma';

async function checkInstanceStatus() {
  try {
    const instances = await prisma.instance.findMany({
      where: {
        userId: 'cm9p5i7f00000qo5bqbqbqbqb', // Remplacez par votre userId
      },
      select: {
        id: true,
        instanceName: true,
        status: true,
        pairingCode: true,
        qrCode: true,
        connectionStatus: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('\n=== INSTANCES DANS LA BASE DE DONNÉES ===\n');
    instances.forEach((instance, index) => {
      console.log(`${index + 1}. ${instance.instanceName}`);
      console.log(`   ID: ${instance.id}`);
      console.log(`   Status: ${instance.status}`);
      console.log(`   Connection Status: ${instance.connectionStatus}`);
      console.log(`   Pairing Code: ${instance.pairingCode || 'Non généré'}`);
      console.log(`   QR Code: ${instance.qrCode ? 'Présent' : 'Absent'}`);
      console.log(`   Créé le: ${instance.createdAt}`);
      console.log('');
    });

    if (instances.length === 0) {
      console.log('❌ Aucune instance trouvée pour cet utilisateur');
    }
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstanceStatus();
