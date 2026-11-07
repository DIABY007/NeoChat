const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '../public/logo-neochat.svg');
const outputDir = path.join(__dirname, '../public/icons');

// Créer le dossier icons s'il n'existe pas
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('🎨 Génération des icônes PWA...');

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    
    try {
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Icône ${size}x${size} générée`);
    } catch (error) {
      console.error(`❌ Erreur pour ${size}x${size}:`, error.message);
    }
  }

  // Générer l'icône maskable (avec padding pour Android)
  try {
    await sharp(inputSvg)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .extend({
        top: 102,
        bottom: 102,
        left: 102,
        right: 102,
        background: { r: 249, g: 115, b: 22, alpha: 1 } // Orange NeoChat
      })
      .png()
      .toFile(path.join(outputDir, 'icon-maskable-512.png'));
    
    console.log('✅ Icône maskable 512x512 générée');
  } catch (error) {
    console.error('❌ Erreur icône maskable:', error.message);
  }

  // Générer les icônes de raccourcis
  const shortcuts = ['dashboard', 'broadcast', 'whatsapp'];
  for (const shortcut of shortcuts) {
    try {
      await sharp(inputSvg)
        .resize(192, 192)
        .png()
        .toFile(path.join(outputDir, `shortcut-${shortcut}.png`));
      
      console.log(`✅ Icône raccourci ${shortcut} générée`);
    } catch (error) {
      console.error(`❌ Erreur raccourci ${shortcut}:`, error.message);
    }
  }

  // Générer apple-touch-icon
  try {
    await sharp(inputSvg)
      .resize(180, 180)
      .png()
      .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
    
    console.log('✅ Apple touch icon générée');
  } catch (error) {
    console.error('❌ Erreur apple-touch-icon:', error.message);
  }

  console.log('🎉 Génération des icônes terminée !');
}

generateIcons().catch(console.error);
