import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import prisma from '../config/prisma';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    phone: string;
    referralCode: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'authentification manquant',
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Token invalide ou expiré',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Erreur d\'authentification',
    });
  }
}

export async function isAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const userPhone = req.user?.phone;

  if (!userPhone) {
    return res.status(401).json({
      success: false,
      error: 'Non authentifié',
    });
  }

  try {
    const admin = await prisma.adminUser.findUnique({
      where: { phoneNumber: userPhone },
    });

    if (!admin || admin.status !== 'ACTIVE') {
      console.warn(`[Security] Tentative d'accès admin refusée: ${userPhone}`);
      return res.status(403).json({
        success: false,
        error: 'Accès refusé: droits administrateur requis',
      });
    }

    // Attacher les infos admin à la requête
    (req as any).admin = admin;
    next();
  } catch (error) {
    console.error('[Auth] Erreur lors de la vérification admin:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification des droits',
    });
  }
}
