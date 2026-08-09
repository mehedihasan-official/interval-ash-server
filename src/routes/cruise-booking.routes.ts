import { Router } from 'express';
import {
  createCruiseBooking,
  getCruiseBookingByReference,
  getCruiseBookingsByEmail,
} from '../controllers/cruise-booking.controller';

const router = Router();

router.post('/', createCruiseBooking);
router.get('/', getCruiseBookingsByEmail);
router.get('/reference/:reference', getCruiseBookingByReference);

export default router;
