import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// Route GET /me pour le dashboard (avec abonnement)
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });

  } catch (error: any) {
    console.error('[User] Erreur lors de la récupération de /me:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        lastName: true,
        referralCode: true,
        referredBy: true,
        walletBalance: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });

  } catch (error: any) {
    console.error('[User] Erreur lors de la récupération du profil:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.patch('/payment-info', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, phone, method, otherMethod } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Le nom et le numéro sont requis',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        paymentName: name,
        paymentPhone: phone,
        paymentMethod: method,
        paymentOtherMethod: otherMethod || null,
      },
      select: {
        id: true,
        phone: true,
        lastName: true,
        referralCode: true,
        referredBy: true,
        walletBalance: true,
        paymentName: true,
        paymentPhone: true,
        paymentMethod: true,
        paymentOtherMethod: true,
      },
    });

    console.log(`[User] Informations de paiement mises à jour pour ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Informations de paiement mises à jour',
      data: updatedUser,
    });

  } catch (error: any) {
    console.error('[User] Erreur lors de la mise à jour des infos de paiement:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.patch('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { lastName, phone } = req.body;

    const updateData: any = {};
    
    if (lastName !== undefined) {
      updateData.lastName = lastName;
    }
    
    if (phone !== undefined) {
      const cleanPhone = phone.replace(/\s/g, '');
      const existingUser = await prisma.user.findUnique({
        where: { phone: cleanPhone },
      });

      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          error: 'Ce numéro de téléphone est déjà utilisé',
        });
      }

      updateData.phone = cleanPhone;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune donnée à mettre à jour',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        phone: true,
        lastName: true,
        referralCode: true,
        referredBy: true,
        walletBalance: true,
      },
    });

    console.log(`[User] Profil mis à jour pour l'utilisateur ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: updatedUser,
    });

  } catch (error: any) {
    console.error('[User] Erreur lors de la mise à jour du profil:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.get('/affiliate-stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Récupérer le code de parrainage de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user || !user.referralCode) {
      return res.status(200).json({
        success: true,
        data: {
          referralCount: 0,
          monthlyEarnings: 0,
          totalEarnings: 0,
        },
      });
    }

    // Compter le nombre de parrainés
    const referralCount = await prisma.user.count({
      where: { referredBy: user.referralCode },
    });

    // Calculer les gains du mois en cours
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyPayments = await prisma.affiliatePayment.aggregate({
      where: {
        userId,
        paymentMethod: 'COMMISSION',
        status: 'COMPLETED',
        processedAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Calculer les gains totaux
    const totalPayments = await prisma.affiliatePayment.aggregate({
      where: {
        userId,
        paymentMethod: 'COMMISSION',
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    const monthlyEarnings = monthlyPayments._sum.amount || 0;
    const totalEarnings = totalPayments._sum.amount || 0;

    return res.status(200).json({
      success: true,
      data: {
        referralCount,
        monthlyEarnings,
        totalEarnings,
      },
    });

  } catch (error: any) {
    console.error('[User] Erreur lors de la récupération des stats d\'affiliation:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.get('/affiliate-payments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { limit = '10', offset = '0' } = req.query;

    const payments = await prisma.affiliatePayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.affiliatePayment.count({
      where: { userId },
    });

    return res.status(200).json({
      success: true,
      data: {
        payments,
        total,
      },
    });

  } catch (error: any) {
    console.error('[User] Erreur lors de la récupération de l\'historique:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.patch('/referral-code', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        error: 'Le code d\'affiliation est requis',
      });
    }

    const cleanCode = referralCode.trim().toUpperCase();

    if (cleanCode.length < 4 || cleanCode.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Le code doit contenir entre 4 et 20 caractères',
      });
    }

    if (!/^[A-Z0-9]+$/.test(cleanCode)) {
      return res.status(400).json({
        success: false,
        error: 'Le code ne peut contenir que des lettres majuscules et des chiffres',
      });
    }

    const existingCode = await prisma.user.findUnique({
      where: { referralCode: cleanCode },
    });

    if (existingCode && existingCode.id !== userId) {
      return res.status(409).json({
        success: false,
        error: 'Ce code d\'affiliation est déjà utilisé',
      });
    }

    if (existingCode && existingCode.id === userId) {
      return res.status(400).json({
        success: false,
        error: 'Vous utilisez déjà ce code',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { referralCode: cleanCode },
      select: {
        id: true,
        phone: true,
        lastName: true,
        referralCode: true,
        referredBy: true,
        walletBalance: true,
      },
    });

    console.log(`[User] Code d'affiliation mis à jour: ${cleanCode} pour l'utilisateur ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Code d\'affiliation mis à jour avec succès',
      data: updatedUser,
    });

  } catch (error: any) {
    console.error('[User] Erreur lors de la mise à jour du code d\'affiliation:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
