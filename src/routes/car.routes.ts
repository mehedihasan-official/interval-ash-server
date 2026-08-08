import { Router } from 'express';
import {
  createCar,
  deleteCar,
  getCarById,
  searchCars,
  updateCar,
} from '../controllers/car.controller';
import { requireAdmin } from '../middlewares/require-admin';

const router = Router();

// Reads are public; writes are admin-only, same pattern as flights/resorts.
router.get('/', searchCars);
router.get('/:id', getCarById);
router.post('/', requireAdmin, createCar);
router.patch('/:id', requireAdmin, updateCar);
router.delete('/:id', requireAdmin, deleteCar);

export default router;
