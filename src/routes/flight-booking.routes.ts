import { Router } from 'express';
import {
  createFlightBooking,
  getFlightBookingByReference,
  getFlightBookingsByEmail,
} from '../controllers/flight-booking.controller';

const router = Router();

// Members create their own bookings and later look them up either by
// the human-readable booking reference (confirmation page) or by their
// signed-in email (their "my bookings" list).
router.post('/', createFlightBooking);
router.get('/', getFlightBookingsByEmail);
router.get('/reference/:reference', getFlightBookingByReference);

export default router;
