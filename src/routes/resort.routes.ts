import { Router } from 'express';
import {
  getAllResorts,
  getResortById,
  createResort,
  updateResort,
  deleteResort,
} from '../controllers/resort.controller';

const router = Router();

router.get('/', getAllResorts);
router.get('/:id', getResortById);
router.post('/', createResort);
router.patch('/:id', updateResort);
router.delete('/:id', deleteResort);

export default router;
