import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import bookingRoutes from './routes/bookings';

const app = express();

// PRODUCTION CORS: Allow your future cloud frontend URL
const allowedOrigins = [
  'http://localhost:5173', // Local Testing
  process.env.FRONTEND_URL  // Production URL (Set this in cloud dashboard)
];

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

// DYNAMIC PORT: Cloud platforms inject a custom port automatically
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Lab allocation engine online at port ${PORT}`);
});