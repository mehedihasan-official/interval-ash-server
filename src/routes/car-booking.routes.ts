import { Router } from 'express';
import {
  createCarBooking,
  getCarBookingByReference,
  getCarBookingsByEmail,
} from '../controllers/car-booking.controller';

const router = Router();

router.post('/', createCarBooking);
router.get('/', getCarBookingsByEmail);
router.get('/reference/:reference', getCarBookingByReference);

export default router;
