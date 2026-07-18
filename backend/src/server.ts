import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import bookingRoutes from './routes/bookings';
import { disconnectDatabase } from './lib/prisma';
import { errorHandler, notFound } from './middleware/errors';

const app = express();

// PRODUCTION CORS: Allow your future cloud frontend URL
const allowedOrigins = [
  'http://localhost:5173', // Local Testing
  process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use(notFound);
app.use(errorHandler);

// DYNAMIC PORT: Cloud platforms inject a custom port automatically
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`Lab allocation engine online at port ${PORT}`);
});

async function shutdown() {
  server.close();
  await disconnectDatabase();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
