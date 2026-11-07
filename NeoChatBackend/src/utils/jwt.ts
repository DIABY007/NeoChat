import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('🚨 FATAL: JWT_SECRET non défini dans les variables d\'environnement');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}
const SECRET = JWT_SECRET || 'dev-only-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

export interface JWTPayload {
  userId: string;
  phone: string;
  referralCode: string;
  role?: string;
}

export function generateToken(payload: JWTPayload, expiresIn: string = JWT_EXPIRES_IN): string {
  return jwt.sign(payload, SECRET, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
