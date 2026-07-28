import { Router } from 'express';
import userRoutes from './user.routes';
import resortRoutes from './resort.routes';
import bookingRoutes from './booking.routes';

/**
 * Central router. Every resource gets its own file and its own base path;
 * this file just wires them together so `server.ts` only has to mount one
 * router instead of importing each one individually.
 */
const router = Router();

router.use('/users', userRoutes);
router.use('/resorts', resortRoutes);
router.use('/bookings', bookingRoutes);

export default router;
