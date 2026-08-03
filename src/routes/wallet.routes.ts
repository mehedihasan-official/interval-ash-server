import { Router } from 'express';
import {
  convertPointsToCash,
  getWalletSummary,
} from '../controllers/wallet.controller';

const router = Router();

router.get('/', getWalletSummary);
router.post('/convert', convertPointsToCash);

export default router;
