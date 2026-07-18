import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAdmin, requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

const bookingSchema = z.object({
  room_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
}).superRefine(({ start_time, end_time }, context) => {
  const start = new Date(start_time);
  const end = new Date(end_time);
  if (end <= start) context.addIssue({ code: 'custom', message: 'End time must be after start time.', path: ['end_time'] });
  if (start <= new Date()) context.addIssue({ code: 'custom', message: 'Start time must be in the future.', path: ['start_time'] });
});

const idSchema = z.string().uuid();

function isBookingConflict(error: unknown) {
  const value = error as { code?: string; meta?: { code?: string }; message?: string };
  return value.code === 'P2004' || value.code === 'P2010' || value.meta?.code === '23P01' || value.message?.includes('no_overlapping_lab_slots') === true;
}

router.get('/list/all', requireAuth, async (_req: Request, res: Response) => {
  const rooms = await prisma.room.findMany({ orderBy: [{ building: 'asc' }, { name: 'asc' }] });
  res.json(rooms);
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const bookings = await prisma.booking.findMany({
    where: { user_id: req.user!.userId },
    orderBy: { start_time: 'asc' },
  });
  res.json(bookings);
});

router.get('/admin/locks', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const bookings = await prisma.booking.findMany({ orderBy: { start_time: 'asc' } });
  res.json(bookings);
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = bookingSchema.parse(req.body);
    const room = await prisma.room.findUnique({ where: { id: data.room_id }, select: { id: true } });
    if (!room) return res.status(404).json({ error: 'Not found', message: 'The selected room no longer exists.' });

    const booking = await prisma.booking.create({
      data: { ...data, user_id: req.user!.userId, start_time: new Date(data.start_time), end_time: new Date(data.end_time) },
    });
    return res.status(201).json({ message: 'Reservation created successfully.', booking });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid reservation', message: error.issues[0]?.message ?? 'Check the reservation times.' });
    if (isBookingConflict(error)) return res.status(409).json({ error: 'Time unavailable', message: 'This room is already reserved for part of that time.' });
    console.error('Booking creation failed:', error);
    return res.status(500).json({ error: 'Booking failed', message: 'Unable to create the reservation.' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Invalid booking ID', message: 'The booking identifier is invalid.' });

  const booking = await prisma.booking.findUnique({ where: { id: id.data } });
  if (!booking) return res.status(404).json({ error: 'Not found', message: 'This reservation no longer exists.' });
  if (booking.user_id !== req.user!.userId && !req.user!.isAdmin) {
    return res.status(403).json({ error: 'Forbidden', message: 'You can only cancel your own reservations.' });
  }

  await prisma.booking.delete({ where: { id: id.data } });
  return res.json({ message: 'Reservation cancelled successfully.' });
});

router.get('/:roomId', requireAuth, async (req: Request, res: Response) => {
  const roomId = idSchema.safeParse(req.params.roomId);
  if (!roomId.success) return res.status(400).json({ error: 'Invalid room ID', message: 'The room identifier is invalid.' });

  const start = req.query.start ? new Date(String(req.query.start)) : new Date();
  const end = req.query.end ? new Date(String(req.query.end)) : new Date(Date.now() + 86_400_000);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
    return res.status(400).json({ error: 'Invalid date range', message: 'Provide a valid start and end time.' });
  }

  const bookings = await prisma.booking.findMany({
    where: { room_id: roomId.data, status: 'CONFIRMED', start_time: { lt: end }, end_time: { gt: start } },
    select: { id: true, start_time: true, end_time: true },
    orderBy: { start_time: 'asc' },
  });
  return res.json(bookings);
});

export default router;
