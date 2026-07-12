import { requireAuth, AuthRequest } from '../middleware/auth';
import 'dotenv/config'; 
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { z } from 'zod';

const router = Router();

// PRISMA 7 FIX: Construct the connection pool and adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Data validation schema (leave the rest of your file below this exactly as it is!)
const BookingValidation = z.object({
  room_id: z.string().uuid(),
  user_id: z.string().uuid(), 
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
});

// CREATE A BOOKING (The Concurrency Engine)
// CREATE A BOOKING (Now protected by requireAuth!)
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const data = BookingValidation.parse(req.body);

    const newBooking = await prisma.booking.create({
      data: {
        room_id: data.room_id,
        user_id: data.user_id,
        start_time: new Date(data.start_time),
        end_time: new Date(data.end_time),
      },
    });

    return res.status(201).json({ message: 'Resource secured successfully', booking: newBooking });
  } catch (error: any) {
    // Catch the Postgres Exclusion Constraint Violation
    if (error.code === 'P2010' || error.message?.includes('23P04')) {
      return res.status(409).json({
        error: 'Conflict Detected',
        message: 'This exact testing window was just claimed by another terminal session milliseconds ago.',
      });
    }
    return res.status(400).json({ error: 'Invalid transaction structure.', details: error.message });
  }
});

// GET ALL BOOKINGS FOR A ROOM (For the Frontend Grid)
router.get('/:room_id', async (req: Request, res: Response): Promise<any> => {
  const { room_id } = req.params;
  
  const start = req.query.start ? new Date(req.query.start as string) : new Date();
  const end = req.query.end ? new Date(req.query.end as string) : new Date(Date.now() + 86400000);

  try {
    const activeBookings = await prisma.booking.findMany({
      where: {
        room_id: String(room_id), // 2. FIXED: Explicitly tell TypeScript this is a String
        status: 'CONFIRMED',
        start_time: { gte: start },
        end_time: { lte: end },
      },
      select: { id: true, start_time: true, end_time: true, user_id: true },
    });
    return res.json(activeBookings);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to synchronize schedules.' });
  }
});

// GET ALL ROOMS (To populate our frontend list)
router.get('/list/all', async (req: Request, res: Response): Promise<any> => {
  const rooms = await prisma.room.findMany();
  return res.json(rooms);
});

// ADMIN COMMAND: GET ALL SYSTEM LOCKS
router.get('/admin/locks', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const allLocks = await prisma.booking.findMany({
      orderBy: { start_time: 'asc' }, // Sort by chronological order
    });
    return res.json(allLocks);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to access global registry.' });
  }
});

// ADMIN COMMAND: REVOKE A HARDWARE LOCK
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const lockId = req.params.id;
    
    // Instruct Prisma to destroy the mathematical lock
    await prisma.booking.delete({
      where: { id: String(lockId) }
    });
    return res.json({ message: 'Hardware lock successfully revoked.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to revoke transaction.' });
  }
});
// GET MY PERSONAL HARDWARE LOCKS
router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // req.user.userId is automatically extracted from their digital keycard!
    const myLocks = await prisma.booking.findMany({
      where: { user_id: req.user.userId },
      orderBy: { start_time: 'asc' },
    });
    return res.json(myLocks);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to access personal registry.' });
  }
});
export default router;