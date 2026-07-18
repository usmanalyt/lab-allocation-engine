import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the standard Express Request so we can attach the user's ID to it
export interface AuthRequest extends Request {
  user?: { userId: string; isAdmin: boolean };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): any => {
  // 1. Look for the "Bearer [token]" header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing digital keycard.' });
  }

  // 2. Extract just the token part
  const token = authHeader.split(' ')[1];

  // 3. Mathematically verify the signature using your secret key
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof decoded !== 'object' || !decoded.userId || typeof decoded.userId !== 'string') {
      return res.status(403).json({ error: 'Forbidden', message: 'Invalid keycard payload.' });
    }
    req.user = { userId: decoded.userId, isAdmin: decoded.isAdmin === true };
    next(); // Everything checks out, let them pass!
  } catch (error) {
    return res.status(403).json({ error: 'Forbidden', message: 'Invalid, forged, or expired keycard.' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Forbidden', message: 'Administrator access is required.' });
  }
  next();
};
