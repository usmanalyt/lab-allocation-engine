import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// PRISMA 7 FIX: Construct the connection pool and adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Validation Schema for Registration/Login
const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

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
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '8h' });

    return res.status(201).json({ message: 'User registered successfully', token, userId: newUser.id });
  } catch (error: any) {
    return res.status(400).json({ error: 'Registration failed', details: error.message });
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
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '8h' });

    return res.json({ message: 'Authentication successful', token, userId: user.id, name: user.name });
  } catch (error: any) {
    return res.status(400).json({ error: 'Login failed', details: error.message });
  }
});

export default router;