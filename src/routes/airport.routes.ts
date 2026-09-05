import { Router } from 'express';
import {
  createAirport,
  getAirportByCode,
  searchAirports,
} from '../controllers/airport.controller';
import { requireAdmin } from '../middlewares/require-admin';

const router = Router();

// Airport data is public reference data — no auth required to read it.
router.get('/', searchAirports);
router.get('/:code', getAirportByCode);

// Writes are admin-only, same pattern as the resort and flight routes.
router.post('/', requireAdmin, createAirport);

export default router;
