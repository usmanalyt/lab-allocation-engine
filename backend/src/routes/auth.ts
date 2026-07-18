import 'dotenv/config';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
const adminEmails = new Set((process.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));

// Validation Schema for Registration/Login
const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().trim().min(2).max(100).optional(),
});

function createToken(userId: string, email: string) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET must be configured before starting the server.');
  const isAdmin = adminEmails.has(email.toLowerCase());
  return { token: jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn: '8h' }), isAdmin };
}

// 1. REGISTER NEW USER
router.post('/register', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, name } = AuthSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Identity conflict', message: 'Email already registered.' });
    }

    // Cryptographically hash the password (salt rounds: 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save to PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || 'Lab User',
        password_hash: hashedPassword,
      },
    });

    // Generate JWT Keycard
    const { token, isAdmin } = createToken(newUser.id, newUser.email);

    return res.status(201).json({ message: 'User registered successfully', token, userId: newUser.id, name: newUser.name, isAdmin });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid registration details', message: 'Use a valid email and a password with at least 6 characters.' });
    console.error('Registration failed:', error);
    return res.status(500).json({ error: 'Registration failed', message: 'Unable to create your account.' });
  }
});

// 2. LOGIN EXISTING USER
router.post('/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = AuthSchema.parse(req.body);

    // Find the user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Access Denied', message: 'Invalid credentials.' });
    }

    // Compare the submitted password to the stored hash
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Access Denied', message: 'Invalid credentials.' });
    }

    // Generate JWT Keycard
    const { token, isAdmin } = createToken(user.id, user.email);

    return res.json({ message: 'Authentication successful', token, userId: user.id, name: user.name, isAdmin });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid credentials', message: 'Enter a valid email and password.' });
    console.error('Login failed:', error);
    return res.status(500).json({ error: 'Login failed', message: 'Unable to sign in right now.' });
  }
});

export default router;
