import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { generateOTP, generateReferralCode, getOTPExpiry } from '../utils/generateOTP';
import SystemMessagesService from '../services/systemMessagesService';
import { generateToken } from '../utils/jwt';
import { posthogNode } from '../lib/analytics';

const router = Router();

router.post('/request-otp', async (req: Request, res: Response) => {
  try {
    const { phone, referredBy, lastName, preferredCountry } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Le numéro de téléphone est requis',
      });
    }

    const cleanPhone = phone.replace(/\s/g, '');

    console.log(`[Auth] Demande OTP pour ${cleanPhone}`);
    if (referredBy) {
      console.log(`[Auth] Code parrain fourni: ${referredBy}`);
    }

    let user = await prisma.user.findUnique({
      where: { phone: cleanPhone },
      include: { subscription: true },
    });

    const otpCode = generateOTP();
    const otpExpiry = getOTPExpiry();

    if (user) {
      console.log(`[Auth] Utilisateur existant trouvé: ${user.id}`);
      
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          otpCode,
          otpExpiry,
          preferredCountry: preferredCountry || user.preferredCountry,
        },
        include: { subscription: true },
      });
    } else {
      console.log(`[Auth] Création d'un nouvel utilisateur`);
      
      const referralCode = generateReferralCode(cleanPhone);
      
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 3);

      user = await prisma.user.create({
        data: {
          phone: cleanPhone,
          lastName: lastName || null,
          otpCode,
          otpExpiry,
          referralCode,
          referredBy: referredBy || null,
          preferredCountry: preferredCountry || 'bf',
          subscription: {
            create: {
              status: 'TRIAL',
              trialEndsAt,
            },
          },
        },
        include: { subscription: true },
      });

      console.log(`[Auth] Nouvel utilisateur créé: ${user.id}`);
      console.log(`[Auth] Code de parrainage généré: ${referralCode}`);

      posthogNode.identify({
        distinctId: user.id,
        properties: {
          phone: cleanPhone,
          country_code: cleanPhone.slice(0, 3),
          referral_code: referralCode,
          referred_by: referredBy || null,
          plan: 'TRIAL',
          created_at: new Date().toISOString(),
        },
      });
      
      if (referredBy) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: referredBy },
        });
        
        if (referrer) {
          console.log(`[Auth] Parrain trouvé: ${referrer.id}`);
        } else {
          console.log(`[Auth] ⚠️ Code parrain invalide: ${referredBy}`);
        }
      }
    }

    const isNewUser = !user?.subscription;

    try {
      await SystemMessagesService.sendOTP(cleanPhone, otpCode);
      
      console.log(`[Auth] ✅ OTP ${otpCode} généré et envoyé à ${cleanPhone}`);
      
      return res.status(200).json({
        success: true,
        message: 'Code OTP envoyé sur WhatsApp',
        data: {
          phone: cleanPhone,
          expiresIn: '5 minutes',
          isNewUser,
        },
      });
    } catch (evolutionError: any) {
      console.error(`[Auth] Erreur Evolution API:`, evolutionError.message);
      
      console.log(`[Auth] 📝 OTP généré mais non envoyé (mode dev): ${otpCode}`);
      
      return res.status(200).json({
        success: true,
        message: 'Code OTP généré (Evolution API non disponible)',
        data: {
          phone: cleanPhone,
          expiresIn: '5 minutes',
          isNewUser,
          devMode: true,
          otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined,
        },
      });
    }
  } catch (error: any) {
    console.error('[Auth] Erreur lors de la génération de l\'OTP:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue lors de la génération du code OTP',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone, otpCode } = req.body;

    if (!phone || !otpCode) {
      return res.status(400).json({
        success: false,
        error: 'Le numéro de téléphone et le code OTP sont requis',
      });
    }

    const cleanPhone = phone.replace(/\s/g, '');

    console.log(`[Auth] Vérification OTP pour ${cleanPhone}`);

    const user = await prisma.user.findUnique({
      where: { phone: cleanPhone },
      include: { 
        subscription: true,
        instances: true,
      },
    });

    if (!user) {
      console.log(`[Auth] ❌ Utilisateur non trouvé: ${cleanPhone}`);
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    if (!user.otpCode || !user.otpExpiry) {
      console.log(`[Auth] ❌ Aucun OTP actif pour ${cleanPhone}`);
      return res.status(400).json({
        success: false,
        error: 'Aucun code OTP actif. Veuillez en demander un nouveau.',
      });
    }

    if (user.otpCode !== otpCode) {
      console.log(`[Auth] ❌ Code OTP invalide pour ${cleanPhone}`);
      return res.status(401).json({
        success: false,
        error: 'Code OTP invalide',
      });
    }

    if (new Date() > user.otpExpiry) {
      console.log(`[Auth] ❌ Code OTP expiré pour ${cleanPhone}`);
      return res.status(401).json({
        success: false,
        error: 'Code OTP expiré. Veuillez en demander un nouveau.',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpExpiry: null,
      },
    });

    const token = generateToken({
      userId: user.id,
      phone: user.phone,
      referralCode: user.referralCode,
    });

    console.log(`[Auth] ✅ OTP validé pour ${cleanPhone} - Token généré`);

    const isNewUser = user.subscription && new Date(user.subscription.createdAt).getTime() > Date.now() - 60000;

    if (isNewUser) {
      const registrationDurationSeconds = Math.round((Date.now() - new Date(user.createdAt).getTime()) / 1000);
      posthogNode.capture({
        distinctId: user.id,
        event: 'user_registered_complete',
        properties: {
          phone_country_code: cleanPhone.slice(0, 3),
          registration_duration_seconds: registrationDurationSeconds,
          otp_attempts_count: 1,
          referral_code_used: user.referredBy || null,
          registration_source: user.referredBy ? 'referral' : 'organic',
          preferred_country: user.preferredCountry || 'bf',
        },
      });

      if (user.lastName) {
        try {
          await SystemMessagesService.sendWelcomeMessage(cleanPhone, user.lastName);
          console.log(`[Auth] 🎉 Message de bienvenue envoyé à ${user.lastName}`);
        } catch (error) {
          console.error(`[Auth] Erreur lors de l'envoi du message de bienvenue:`, error);
        }
      }
    }

    if (user.referredBy) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: user.referredBy },
      });

      if (referrer) {
        console.log(`[Auth] 💰 Parrain identifié: ${referrer.id} (${user.referredBy})`);
        posthogNode.capture({
          distinctId: referrer.id,
          event: 'referral_successful',
          properties: {
            referred_user_id: user.id,
            referral_code: user.referredBy,
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Authentification réussie',
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          lastName: user.lastName,
          referralCode: user.referralCode,
          referredBy: user.referredBy,
          walletBalance: user.walletBalance,
          preferredCountry: user.preferredCountry,
        },
        subscription: user.subscription ? {
          status: user.subscription.status,
          messageCount: user.subscription.messageCount,
          trialEndsAt: user.subscription.trialEndsAt,
          nextBillingAt: user.subscription.nextBillingAt,
        } : null,
        instances: user.instances.map(instance => ({
          id: instance.id,
          instanceName: instance.instanceName,
          status: instance.status,
          difyAppId: instance.difyAppId,
        })),
      },
    });
  } catch (error: any) {
    console.error('[Auth] Erreur lors de la vérification de l\'OTP:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue lors de la vérification du code OTP',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
