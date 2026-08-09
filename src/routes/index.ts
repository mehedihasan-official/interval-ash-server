import { Router } from 'express';
import userRoutes from './user.routes';
import resortRoutes from './resort.routes';
import bookingRoutes from './booking.routes';
import walletRoutes from './wallet.routes';
import airportRoutes from './airport.routes';
import flightRoutes from './flight.routes';
import flightBookingRoutes from './flight-booking.routes';
import carRoutes from './car.routes';
import carBookingRoutes from './car-booking.routes';
import cruiseRoutes from './cruise.routes';
import cruiseBookingRoutes from './cruise-booking.routes';
import { getAllUsers, updateUserRole } from '../controllers/user.controller';

/**
 * Central router. Every resource gets its own file and its own base path;
 * this file just wires them together so `server.ts` only has to mount one
 * router instead of importing each one individually.
 */
const router = Router();

router.use('/users', userRoutes);
router.use('/resorts', resortRoutes);
router.use('/bookings', bookingRoutes);
router.use('/wallet', walletRoutes);
router.use('/airports', airportRoutes);
router.use('/flights', flightRoutes);
router.use('/flight-bookings', flightBookingRoutes);
router.use('/cars', carRoutes);
router.use('/car-bookings', carBookingRoutes);
router.use('/cruises', cruiseRoutes);
router.use('/cruise-bookings', cruiseBookingRoutes);

// Aliases for the admin panel client, which calls these two flatter paths
// instead of the REST-nested /users and /users/role routes above. Both
// point at the exact same controllers, so behavior is identical either
// way — this just satisfies the URLs the client already calls without
// duplicating any logic.
router.get('/all-users', getAllUsers);
router.patch('/update-user', updateUserRole);

export default router;
