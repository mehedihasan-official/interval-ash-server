import { Router } from 'express';
import {
  getAirportByCode,
  searchAirports,
} from '../controllers/airport.controller';

const router = Router();

// Airport data is public reference data — no auth required.
router.get('/', searchAirports);
router.get('/:code', getAirportByCode);

export default router;
