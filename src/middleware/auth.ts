import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { findUserByUid } from '../db/users.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { uid: string; email?: string; name?: string };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];

  // Support direct CRM User session tokens for team accounts (Ali, Usama, Sales Manager, etc.)
  if (token.startsWith('crm-uid:')) {
    const uid = token.replace('crm-uid:', '').trim();
    try {
      const dbUser = await findUserByUid(uid);
      if (!dbUser || dbUser.accountStatus === 'Inactive') {
        return res.status(401).json({ error: 'Unauthorized: Account not found or inactive' });
      }
      req.user = {
        uid: dbUser.uid,
        email: dbUser.email,
        name: dbUser.name,
      };
      return next();
    } catch (err) {
      console.error('Error verifying CRM session token:', err);
      return res.status(401).json({ error: 'Unauthorized: Invalid session' });
    }
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
