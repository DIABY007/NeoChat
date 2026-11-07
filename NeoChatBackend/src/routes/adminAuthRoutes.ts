import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { generateOTP, getOTPExpiry } from '../utils/generateOTP';
import { generateToken } from '../utils/jwt';
import SystemMessagesService from '../services/systemMessagesService';

const router = Router();

// ─── Demande d'OTP ─────────────────────────────────────────
router.post('/request-otp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Le numéro de téléphone est requis',
      });
    }

    let cleanPhone = phone.replace(/[\s\-\.]/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('00226')) {
        cleanPhone = `+${cleanPhone.slice(2)}`;
      } else if (cleanPhone.startsWith('226')) {
        cleanPhone = `+${cleanPhone}`;
      } else {
        cleanPhone = `+226${cleanPhone}`;
      }
    }
    console.log(`[AdminAuth] Demande OTP admin pour ${cleanPhone}`);

    // Vérifier que l'admin existe et est ACTIF
    const admin = await prisma.adminUser.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!admin) {
      console.log(`[AdminAuth] ❌ Aucun admin trouvé: ${cleanPhone}`);
      return res.status(404).json({
        success: false,
        error: 'Accès non autorisé. Ce numéro n\'est pas enregistré comme administrateur.',
      });
    }

    if (admin.status !== 'ACTIVE') {
      console.log(`[AdminAuth] ❌ Admin désactivé: ${cleanPhone}`);
      return res.status(403).json({
        success: false,
        error: 'Compte désactivé. Contactez le super-administrateur.',
      });
    }

    // Générer et stocker l'OTP
    const otpCode = generateOTP();
    const otpExpiry = getOTPExpiry();

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { otpCode, otpExpiry },
    });

    console.log(`[AdminAuth] OTP ${otpCode} généré pour l'admin ${admin.name || cleanPhone}`);

    // Envoyer l'OTP via WhatsApp (instance System)
    try {
      await SystemMessagesService.sendOTP(cleanPhone, otpCode);
      console.log(`[AdminAuth] ✅ OTP envoyé à ${cleanPhone}`);

      return res.status(200).json({
        success: true,
        message: 'Code OTP envoyé sur WhatsApp',
        data: {
          phone: cleanPhone,
          expiresIn: '5 minutes',
        },
      });
    } catch (evolutionError: any) {
      console.error(`[AdminAuth] Erreur Evolution API:`, evolutionError.message);

      // En dev, on retourne l'OTP dans la réponse
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      console.log(`[AdminAuth] 📝 OTP ${isDev ? otpCode : 'masqué'} (mode ${isDev ? 'dev' : 'prod'})`);

      return res.status(200).json({
        success: true,
        message: isDev
          ? `Code OTP (mode dev): ${otpCode}`
          : 'Code OTP généré mais non envoyé',
        data: {
          phone: cleanPhone,
          expiresIn: '5 minutes',
          devMode: isDev,
          ...(isDev && { otpCode }),
        },
      });
    }
  } catch (error: any) {
    console.error('[AdminAuth] Erreur génération OTP:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue lors de la génération du code OTP',
    });
  }
});

// ─── Vérification OTP ──────────────────────────────────────
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone, otpCode } = req.body;

    if (!phone || !otpCode) {
      return res.status(400).json({
        success: false,
        error: 'Le numéro de téléphone et le code OTP sont requis',
      });
    }

    let cleanPhone = phone.replace(/[\s\-\.]/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('00226')) {
        cleanPhone = `+${cleanPhone.slice(2)}`;
      } else if (cleanPhone.startsWith('226')) {
        cleanPhone = `+${cleanPhone}`;
      } else {
        cleanPhone = `+226${cleanPhone}`;
      }
    }
    console.log(`[AdminAuth] Vérification OTP pour ${cleanPhone}`);

    const admin = await prisma.adminUser.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!admin) {
      console.log(`[AdminAuth] ❌ Admin non trouvé: ${cleanPhone}`);
      return res.status(404).json({
        success: false,
        error: 'Accès non autorisé.',
      });
    }

    if (!admin.otpCode || !admin.otpExpiry) {
      console.log(`[AdminAuth] ❌ Aucun OTP actif pour ${cleanPhone}`);
      return res.status(400).json({
        success: false,
        error: 'Aucun code OTP actif. Veuillez en demander un nouveau.',
      });
    }

    if (admin.otpCode !== otpCode) {
      console.log(`[AdminAuth] ❌ Code OTP invalide pour ${cleanPhone}`);
      return res.status(401).json({
        success: false,
        error: 'Code OTP invalide',
      });
    }

    if (new Date() > admin.otpExpiry) {
      console.log(`[AdminAuth] ❌ Code OTP expiré pour ${cleanPhone}`);
      return res.status(401).json({
        success: false,
        error: 'Code OTP expiré. Veuillez en demander un nouveau.',
      });
    }

    // ✅ OTP valide → nettoyer et générer le token
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        otpCode: null,
        otpExpiry: null,
      },
    });

    const token = generateToken({
      userId: admin.id,
      phone: admin.phoneNumber,
      referralCode: 'ADMIN',
      role: admin.role,
    }, '30d');

    console.log(`[AdminAuth] ✅ Admin connecté: ${admin.name || cleanPhone} (${admin.role})`);

    return res.status(200).json({
      success: true,
      message: 'Authentification admin réussie',
      data: {
        token,
        admin: {
          id: admin.id,
          phoneNumber: admin.phoneNumber,
          role: admin.role,
          name: admin.name,
        },
      },
    });
  } catch (error: any) {
    console.error('[AdminAuth] Erreur vérification OTP:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue lors de la vérification du code OTP',
    });
  }
});

export default router;