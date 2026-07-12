import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the standard Express Request so we can attach the user's ID to it
export interface AuthRequest extends Request {
  user?: any;
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded; // Attach the validated user data to the request
    next(); // Everything checks out, let them pass!
  } catch (error) {
    return res.status(403).json({ error: 'Forbidden', message: 'Invalid, forged, or expired keycard.' });
  }
};