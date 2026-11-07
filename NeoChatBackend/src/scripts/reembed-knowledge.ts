import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/prisma';
import { generateEmbedding } from '../services/knowledgeService';

async function reembedAll() {
  console.log('🔄 Début de la re-vectorisation avec Google Gemini (gemini-embedding-001)...');

  // 1. Traitement des KnowledgeDocument
  const kDocs = await prisma.knowledgeDocument.findMany();
  console.log(`📚 ${kDocs.length} KnowledgeDocuments trouvés.`);

  for (const doc of kDocs) {
    try {
      console.log(`\n📄 Traitement de "${doc.name}" (ID: ${doc.id})...`);
      const parsed = JSON.parse(doc.content);
      if (!parsed.chunks || !Array.isArray(parsed.chunks)) {
        console.log(`⏩ Pas de chunks dans "${doc.name}", passage.`);
        continue;
      }

      for (let i = 0; i < parsed.chunks.length; i++) {
        const chunk = parsed.chunks[i];
        if (chunk.text) {
          process.stdout.write(`  - Chunk ${i + 1}/${parsed.chunks.length}... `);
          let success = false;
          let attempts = 0;
          while (!success && attempts < 5) {
            try {
              attempts++;
              const embedding = await generateEmbedding(chunk.text);
              chunk.embedding = embedding;
              console.log(`✅ (${embedding.length} dims)`);
              success = true;
              // Petite pause pour respecter les quotas de débit
              await new Promise((r) => setTimeout(r, 600));
            } catch (err: any) {
              if (err.message.includes('429') || err.message.includes('quota')) {
                console.log(`⏳ Limite atteinte, attente 15s avant nouvel essai (${attempts}/5)...`);
                await new Promise((r) => setTimeout(r, 15000));
              } else {
                throw err;
              }
            }
          }
        }
      }

      await prisma.knowledgeDocument.update({
        where: { id: doc.id },
        data: { content: JSON.stringify(parsed) },
      });
      console.log(`💾 "${doc.name}" mis à jour avec succès.`);
    } catch (err: any) {
      console.error(`❌ Erreur sur KnowledgeDocument "${doc.name}":`, err.message);
    }
  }

  // 2. Traitement des Document (pgvector)
  const docs = await prisma.document.findMany();
  console.log(`\n📊 ${docs.length} documents trouvés dans la table Document.`);

  for (const doc of docs) {
    try {
      process.stdout.write(`  - Document ID ${doc.id}... `);
      let success = false;
      let attempts = 0;
      let embedding: number[] = [];
      while (!success && attempts < 5) {
        try {
          attempts++;
          embedding = await generateEmbedding(doc.content);
          success = true;
          await new Promise((r) => setTimeout(r, 600));
        } catch (err: any) {
          if (err.message.includes('429') || err.message.includes('quota')) {
            console.log(`⏳ Attente 15s...`);
            await new Promise((r) => setTimeout(r, 15000));
          } else {
            throw err;
          }
        }
      }
      const embeddingStr = `[${embedding.join(',')}]`;

      await prisma.$executeRawUnsafe(
        `UPDATE "Document" SET embedding = $1::vector, "updatedAt" = NOW() WHERE id = $2`,
        embeddingStr,
        doc.id
      );
      console.log(`✅ Mis à jour (${embedding.length} dims)`);
    } catch (err: any) {
      console.error(`❌ Erreur sur Document ${doc.id}:`, err.message);
    }
  }

  console.log('\n🎉 Re-vectorisation terminée avec succès !');
}

reembedAll()
  .catch((err) => {
    console.error('Fatal error:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
