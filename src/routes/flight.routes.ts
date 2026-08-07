import { Router } from 'express';
import {
  createFlight,
  deleteFlight,
  getFlightById,
  searchFlights,
  updateFlight,
} from '../controllers/flight.controller';
import { requireAdmin } from '../middlewares/require-admin';

const router = Router();

// Reads are public — anyone browsing the site can search flights.
router.get('/', searchFlights);
router.get('/:id', getFlightById);

// Writes are admin-only, same pattern as the resort routes.
router.post('/', requireAdmin, createFlight);
router.patch('/:id', requireAdmin, updateFlight);
router.delete('/:id', requireAdmin, deleteFlight);

export default router;
