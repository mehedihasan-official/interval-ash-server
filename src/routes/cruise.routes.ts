import { Router } from 'express';
import {
  createCruise,
  deleteCruise,
  getCruiseById,
  getCruiseCategories,
  searchCruises,
  updateCruise,
} from '../controllers/cruise.controller';
import { requireAdmin } from '../middlewares/require-admin';

const router = Router();

// Categories endpoint has to be declared before /:id so it doesn't get
// swallowed by the wildcard.
router.get('/meta/categories', getCruiseCategories);

router.get('/', searchCruises);
router.get('/:id', getCruiseById);
router.post('/', requireAdmin, createCruise);
router.patch('/:id', requireAdmin, updateCruise);
router.delete('/:id', requireAdmin, deleteCruise);

export default router;
