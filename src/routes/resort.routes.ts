import { Router } from 'express';
import {
  getAllResorts,
  getResortById,
  createResort,
  updateResort,
  deleteResort,
} from '../controllers/resort.controller';
import { requireAdmin } from '../middlewares/require-admin';

const router = Router();

// Reads stay public — the resort directory is browsable by anyone.
router.get('/', getAllResorts);
router.get('/:id', getResortById);

// Writes are admin-only. requireAdmin runs first so an unauthorized
// request never reaches the database.
router.post('/', requireAdmin, createResort);
router.patch('/:id', requireAdmin, updateResort);
router.delete('/:id', requireAdmin, deleteResort);

export default router;
