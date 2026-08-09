import { Router } from 'express';
import {
  createCruise,
  deleteCruise,
  getCruiseById,
  getCruiseCategories,
  searchCruisePorts,
  searchCruises,
  updateCruise,
} from '../controllers/cruise.controller';
import { requireAdmin } from '../middlewares/require-admin';

const router = Router();

// Meta endpoints have to be declared before /:id so they don't get
// swallowed by the wildcard.
router.get('/meta/categories', getCruiseCategories);
router.get('/meta/ports', searchCruisePorts);

router.get('/', searchCruises);
router.get('/:id', getCruiseById);
router.post('/', requireAdmin, createCruise);
router.patch('/:id', requireAdmin, updateCruise);
router.delete('/:id', requireAdmin, deleteCruise);

export default router;
