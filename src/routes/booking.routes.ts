import { Router } from 'express';
import {
  getAllBookings,
  getBookingsByEmail,
  createBooking,
  updateBooking,
  deleteBooking,
} from '../controllers/booking.controller';

const router = Router();

// NOTE: '/all' is registered before '/' so it is not confused with
// query-based lookups; both resolve to GET on the bookings root in
// practice, but keeping them explicit keeps intent readable.
router.get('/all', getAllBookings);
router.get('/', getBookingsByEmail);
router.post('/', createBooking);
router.patch('/:id', updateBooking);
router.delete('/:id', deleteBooking);

export default router;
