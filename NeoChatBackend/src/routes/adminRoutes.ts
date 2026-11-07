import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, isAdmin, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// Sécurisation globale : toutes les routes nécessitent authentification + droits admin
router.use(authenticate);
router.use(isAdmin);

/**
 * POST /api/admin/affiliates/:userId/declare-payment
 * Déclare un paiement à un ambassadeur et déduit le montant de sa cagnotte
 * CRITIQUE: Utilise une transaction atomique pour garantir la cohérence
 */
router.post('/affiliates/:userId/declare-payment', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { amount, notes } = req.body;
    const adminUserId = req.user!.userId;

    // Validation des données
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Le montant doit être un nombre positif',
      });
    }

    // Récupérer l'utilisateur (ambassadeur)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        lastName: true,
        walletBalance: true,
        paymentName: true,
        paymentPhone: true,
        paymentMethod: true,
        paymentOtherMethod: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Ambassadeur non trouvé',
      });
    }

    // Garde-fou 1: Vérifier que l'ambassadeur a renseigné ses infos de paiement
    if (!user.paymentPhone || !user.paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'L\'ambassadeur n\'a pas renseigné ses informations de paiement',
        details: {
          paymentPhone: user.paymentPhone,
          paymentMethod: user.paymentMethod,
        },
      });
    }

    // Garde-fou 2: Vérifier que le montant ne dépasse pas le solde
    if (amount > user.walletBalance) {
      return res.status(400).json({
        success: false,
        error: 'Le montant dépasse le solde disponible',
        details: {
          requested: amount,
          available: user.walletBalance,
        },
      });
    }

    console.log(`[Admin] Déclaration de paiement pour ${user.phone} - Montant: ${amount} FCFA`);

    // Transaction atomique CRITIQUE
    const payment = await prisma.$transaction(async (tx) => {
      // 1. Créer l'enregistrement de paiement
      const newPayment = await tx.affiliatePayment.create({
        data: {
          userId: user.id,
          amount: amount,
          paymentMethod: user.paymentMethod!,
          paymentDetails: user.paymentPhone!,
          status: 'COMPLETED',
          processedBy: adminUserId,
          processedAt: new Date(),
          notes: notes || null,
        },
      });

      // 2. DÉDUIRE le montant de la cagnotte (décrémentation atomique)
      await tx.user.update({
        where: { id: user.id },
        data: {
          walletBalance: {
            decrement: amount,
          },
        },
      });

      console.log(`[Admin] ✅ Paiement ${newPayment.id} créé - Cagnotte décrémentée de ${amount} FCFA`);
      console.log(`[Admin] Nouveau solde: ${user.walletBalance - amount} FCFA`);

      return newPayment;
    });

    return res.status(201).json({
      success: true,
      message: 'Paiement déclaré avec succès',
      data: {
        payment: {
          id: payment.id,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          paymentDetails: payment.paymentDetails,
          status: payment.status,
          processedAt: payment.processedAt,
          notes: payment.notes,
        },
        ambassador: {
          id: user.id,
          phone: user.phone,
          lastName: user.lastName,
          previousBalance: user.walletBalance,
          newBalance: user.walletBalance - amount,
        },
      },
    });

  } catch (error: any) {
    console.error('[Admin] Erreur lors de la déclaration de paiement:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue lors de la déclaration du paiement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/affiliates/payments/history
 * Récupère l'historique complet des paiements aux ambassadeurs
 */
router.get('/affiliates/payments/history', async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // Construire les filtres
    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }

    // Récupérer les paiements avec les infos de l'ambassadeur
    const payments = await prisma.affiliatePayment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            lastName: true,
            referralCode: true,
            walletBalance: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limitNum,
      skip: offsetNum,
    });

    // Compter le total pour la pagination
    const total = await prisma.affiliatePayment.count({ where });

    console.log(`[Admin] Historique des paiements récupéré: ${payments.length} résultats`);

    return res.status(200).json({
      success: true,
      data: {
        payments: payments.map(p => ({
          id: p.id,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          paymentDetails: p.paymentDetails,
          status: p.status,
          processedBy: p.processedBy,
          processedAt: p.processedAt,
          notes: p.notes,
          createdAt: p.createdAt,
          ambassador: {
            id: p.user.id,
            phone: p.user.phone,
            lastName: p.user.lastName,
            referralCode: p.user.referralCode,
            currentBalance: p.user.walletBalance,
          },
        })),
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < total,
        },
      },
    });

  } catch (error: any) {
    console.error('[Admin] Erreur lors de la récupération de l\'historique:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/stats/overview
 * Calcule et retourne les KPIs essentiels du dashboard admin
 */
router.get('/stats/overview', async (req: AuthRequest, res: Response) => {
  try {
    console.log('[Admin] Calcul des KPIs du dashboard...');

    // Date de début du mois en cours
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // 1. REVENUS & FINANCES
    // Calculer le MRR en fonction des 3 offres de tarification
    const diffusionCount = await prisma.subscription.count({
      where: { status: 'DIFFUSION' },
    });
    const assistantCount = await prisma.subscription.count({
      where: { status: 'ASSISTANT' },
    });
    const premiumCount = await prisma.subscription.count({
      where: { status: 'PREMIUM' },
    });
    
    // MRR = (DIFFUSION × 5000) + (ASSISTANT × 7500) + (PREMIUM × 10000)
    const MRR = (diffusionCount * 5000) + (assistantCount * 7500) + (premiumCount * 10000);

    // Revenus mensuels (nouveaux abonnements ce mois)
    const newDiffusionThisMonth = await prisma.subscription.count({
      where: {
        status: 'DIFFUSION',
        updatedAt: { gte: startOfMonth },
      },
    });
    const newAssistantThisMonth = await prisma.subscription.count({
      where: {
        status: 'ASSISTANT',
        updatedAt: { gte: startOfMonth },
      },
    });
    const newPremiumThisMonth = await prisma.subscription.count({
      where: {
        status: 'PREMIUM',
        updatedAt: { gte: startOfMonth },
      },
    });
    const monthlyRevenue = (newDiffusionThisMonth * 5000) + (newAssistantThisMonth * 7500) + (newPremiumThisMonth * 10000);

    const totalWalletBalance = await prisma.user.aggregate({
      _sum: { walletBalance: true },
    });
    const totalDebt = totalWalletBalance._sum.walletBalance || 0;

    // 2. UTILISATEURS
    const totalUsers = await prisma.user.count();

    const newUsersThisMonth = await prisma.user.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    const activeUsers = await prisma.user.count({
      where: { 
        subscription: { 
          status: { in: ['DIFFUSION', 'ASSISTANT', 'PREMIUM'] }
        } 
      },
    });

    const trialUsers = await prisma.subscription.count({
      where: { status: 'TRIAL' },
    });

    const expiredUsers = await prisma.subscription.count({
      where: { status: 'EXPIRED' },
    });

    const conversionRate = activeUsers + trialUsers > 0
      ? ((activeUsers / (activeUsers + trialUsers)) * 100).toFixed(2)
      : '0.00';

    // 3. INSTANCES WHATSAPP
    const totalInstances = await prisma.instance.count();

    const connectedInstances = await prisma.instance.count({
      where: { status: 'CONNECTED' },
    });

    const connectionRate = totalInstances > 0
      ? ((connectedInstances / totalInstances) * 100).toFixed(2)
      : '0.00';

    // 4. AFFILIATION
    const ambassadors = await prisma.user.count({
      where: {
        OR: [
          { walletBalance: { gt: 0 } },
          { referredBy: { not: null } },
        ],
      },
    });

    const totalReferrals = await prisma.user.count({
      where: { referredBy: { not: null } },
    });

    const pendingPayouts = await prisma.user.aggregate({
      _sum: { walletBalance: true },
      where: { walletBalance: { gt: 0 } },
    });

    const paidThisMonth = await prisma.affiliatePayment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'COMPLETED',
        processedAt: { gte: startOfMonth },
      },
    });

    // 5. MESSAGES
    const totalMessages = await prisma.subscription.aggregate({
      _sum: { messageCount: true },
    });

    console.log('[Admin] ✅ KPIs calculés avec succès');

    return res.status(200).json({
      success: true,
      data: {
        revenue: {
          mrr: MRR,
          monthlyRevenue: monthlyRevenue,
          totalDebt: totalDebt,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          trial: trialUsers,
          expired: expiredUsers,
          newThisMonth: newUsersThisMonth,
          conversionRate: parseFloat(conversionRate),
        },
        instances: {
          total: totalInstances,
          connected: connectedInstances,
          connectionRate: parseFloat(connectionRate),
        },
        affiliation: {
          ambassadors: ambassadors,
          totalReferrals: totalReferrals,
          pendingPayouts: pendingPayouts._sum.walletBalance || 0,
          paidThisMonth: paidThisMonth._sum.amount || 0,
        },
        messages: {
          total: totalMessages._sum.messageCount || 0,
        },
      },
    });

  } catch (error: any) {
    console.error('[Admin] Erreur lors du calcul des KPIs:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue lors du calcul des statistiques',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/affiliates
 * Liste tous les ambassadeurs avec leur solde
 */
router.get('/affiliates', async (req: AuthRequest, res: Response) => {
  try {
    const { minBalance = '0' } = req.query;
    const minBalanceNum = parseFloat(minBalance as string);

    const ambassadors = await prisma.user.findMany({
      where: {
        walletBalance: { gte: minBalanceNum },
      },
      select: {
        id: true,
        phone: true,
        lastName: true,
        referralCode: true,
        walletBalance: true,
        paymentName: true,
        paymentPhone: true,
        paymentMethod: true,
        createdAt: true,
        _count: {
          select: {
            affiliatePayments: true,
          },
        },
      },
      orderBy: {
        walletBalance: 'desc',
      },
    });

    // Compter les filleuls pour chaque ambassadeur
    const ambassadorsWithReferrals = await Promise.all(
      ambassadors.map(async (ambassador) => {
        const referralsCount = await prisma.user.count({
          where: { referredBy: ambassador.referralCode },
        });

        return {
          ...ambassador,
          referralsCount,
          paymentsCount: ambassador._count.affiliatePayments,
        };
      })
    );

    console.log(`[Admin] ${ambassadorsWithReferrals.length} ambassadeurs récupérés`);

    return res.status(200).json({
      success: true,
      data: {
        ambassadors: ambassadorsWithReferrals,
        total: ambassadorsWithReferrals.length,
      },
    });

  } catch (error: any) {
    console.error('[Admin] Erreur lors de la récupération des ambassadeurs:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/users
 * Liste tous les utilisateurs avec leurs abonnements
 */
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    console.log('[Admin] Récupération de la liste des utilisateurs...');

    const users = await prisma.user.findMany({
      include: {
        subscription: {
          select: {
            id: true,
            status: true,
            messageCount: true,
            trialEndsAt: true,
            nextBillingAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`[Admin] ${users.length} utilisateurs récupérés`);

    return res.status(200).json({
      success: true,
      data: {
        users,
        total: users.length,
      },
    });

  } catch (error: any) {
    console.error('[Admin] Erreur lors de la récupération des utilisateurs:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/admin/users/:userId
 * Modifie un utilisateur (nom, prénom, statut d'abonnement)
 */
router.put('/users/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, subscriptionStatus } = req.body;

    console.log(`[Admin] Modification de l'utilisateur ${userId}`);

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName || null,
        lastName: lastName || null,
      },
    });

    // Mettre à jour le statut d'abonnement si fourni
    if (subscriptionStatus && user.subscription) {
      // Calculer les dates selon le plan
      const now = new Date();
      let updateData: any = {
        status: subscriptionStatus,
      };

      // Pour les plans payés, ajouter 30 jours
      if (['ASSISTANT', 'DIFFUSION', 'PREMIUM'].includes(subscriptionStatus)) {
        const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        updateData.nextBillingAt = nextBilling;
        updateData.trialEndsAt = nextBilling;
        updateData.messageCount = 0; // Réinitialiser le compteur
      } else if (subscriptionStatus === 'TRIAL') {
        // Pour TRIAL, 7 jours
        const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        updateData.trialEndsAt = trialEnd;
        updateData.nextBillingAt = null;
        updateData.messageCount = 0;
      } else if (subscriptionStatus === 'EXPIRED') {
        // Pour EXPIRED, dates dans le passé
        updateData.trialEndsAt = now;
        updateData.nextBillingAt = now;
      }

      await prisma.subscription.update({
        where: { id: user.subscription.id },
        data: updateData,
      });

      console.log(`[Admin] ✅ Abonnement mis à jour: ${subscriptionStatus}, nextBillingAt: ${updateData.nextBillingAt}`);
    } else if (subscriptionStatus && !user.subscription) {
      // Créer un abonnement si l'utilisateur n'en a pas
      const now = new Date();
      let createData: any = {
        userId: userId,
        status: subscriptionStatus,
        messageCount: 0,
      };

      if (['ASSISTANT', 'DIFFUSION', 'PREMIUM'].includes(subscriptionStatus)) {
        const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        createData.nextBillingAt = nextBilling;
        createData.trialEndsAt = nextBilling;
      } else {
        const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        createData.trialEndsAt = trialEnd;
      }

      await prisma.subscription.create({
        data: createData,
      });

      console.log(`[Admin] ✅ Abonnement créé: ${subscriptionStatus}`);
    }

    console.log(`[Admin] ✅ Utilisateur ${userId} modifié avec succès`);

    return res.status(200).json({
      success: true,
      message: 'Utilisateur modifié avec succès',
      data: {
        user: updatedUser,
      },
    });

  } catch (error: any) {
    console.error('[Admin] Erreur lors de la modification de l\'utilisateur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue lors de la modification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Supprime un utilisateur et toutes ses données associées
 */
router.delete('/users/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    console.log(`[Admin] Suppression de l'utilisateur ${userId}`);

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    // Supprimer l'utilisateur (cascade delete configuré dans Prisma)
    await prisma.user.delete({
      where: { id: userId },
    });

    console.log(`[Admin] ✅ Utilisateur ${userId} supprimé avec succès`);

    return res.status(200).json({
      success: true,
      message: 'Utilisateur supprimé avec succès',
    });

  } catch (error: any) {
    console.error('[Admin] Erreur lors de la suppression de l\'utilisateur:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur est survenue lors de la suppression',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ─── GESTION DES ADMINS (SUPER_ADMIN seulement) ────────────

/**
 * GET /api/admin/admins
 * Liste tous les administrateurs
 */
router.get('/admins', async (req: AuthRequest, res: Response) => {
  try {
    const admins = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phoneNumber: true,
        role: true,
        name: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            annonces: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: admins,
    });
  } catch (error: any) {
    console.error('[Admin] Erreur liste admins:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/admin/admins
 * Crée un nouvel administrateur (SUPER_ADMIN seulement)
 */
router.post('/admins', async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumber, role, name } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Le numéro de téléphone est requis' });
    }

    // Vérifier si déjà existant
    const existing = await prisma.adminUser.findUnique({ where: { phoneNumber } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Cet admin existe déjà' });
    }

    const admin = await prisma.adminUser.create({
      data: {
        phoneNumber,
        role: role || 'SECRETARY',
        name: name || null,
      },
    });

    console.log(`[Admin] ✅ Admin créé: ${admin.phoneNumber} (${admin.role})`);
    return res.status(201).json({ success: true, data: admin });
  } catch (error: any) {
    console.error('[Admin] Erreur création admin:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la création' });
  }
});

/**
 * PUT /api/admin/admins/:id
 * Modifie un administrateur (rôle, nom)
 */
router.put('/admins/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role, name, phoneNumber } = req.body;

    const admin = await prisma.adminUser.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(name !== undefined && { name }),
        ...(phoneNumber && { phoneNumber }),
      },
    });

    console.log(`[Admin] ✅ Admin ${id} mis à jour`);
    return res.status(200).json({ success: true, data: admin });
  } catch (error: any) {
    console.error('[Admin] Erreur MAJ admin:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * DELETE /api/admin/admins/:id
 * Archive un administrateur (passe en ARCHIVED)
 */
router.delete('/admins/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const admin = await prisma.adminUser.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    console.log(`[Admin] ✅ Admin ${id} archivé`);
    return res.status(200).json({ success: true, message: 'Admin archivé', data: admin });
  } catch (error: any) {
    console.error('[Admin] Erreur archivage admin:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de l\'archivage' });
  }
});

// ─── ANNONCES EXPRESS ──────────────────────────────────────

/**
 * GET /api/admin/annonces
 * Liste les annonces actives (non expirees)
 */
router.get('/annonces', async (req: AuthRequest, res: Response) => {
  try {
    const annonces = await prisma.annonceExpress.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
        createdByAdmin: {
          role: { not: 'BGE' },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        createdByAdmin: { select: { name: true } },
      },
    });

    return res.status(200).json({
      success: true,
      data: annonces.map((a) => ({
        id: a.id,
        message: a.message,
        expiresAt: a.expiresAt,
        createdAt: a.createdAt,
        author: a.createdByAdmin?.name || 'Administration',
      })),
    });
  } catch (error: any) {
    console.error('[Admin] Erreur liste annonces:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/admin/annonces
 * Cree une annonce express
 */
router.post('/annonces', async (req: AuthRequest, res: Response) => {
  try {
    const { message, expiresAt } = req.body;
    const adminId = (req as any).admin?.id;

    if (!message || !expiresAt) {
      return res.status(400).json({ success: false, error: 'Message et date d\'expiration requis' });
    }

    const annonce = await prisma.annonceExpress.create({
      data: {
        message,
        expiresAt: new Date(expiresAt),
        createdBy: adminId,
      },
    });

    console.log(`[Admin] ✅ Annonce créee: ${annonce.id}`);
    return res.status(201).json({ success: true, data: annonce });
  } catch (error: any) {
    console.error('[Admin] Erreur création annonce:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la création' });
  }
});

/**
 * DELETE /api/admin/annonces/:id
 * Archive une annonce
 */
router.delete('/annonces/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.annonceExpress.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return res.status(200).json({ success: true, message: 'Annonce archivée' });
  } catch (error: any) {
    console.error('[Admin] Erreur archivage annonce:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de l\'archivage' });
  }
});

export default router;
