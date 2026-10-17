import { Router } from 'express';
import { reportController } from '../controllers/reportController';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireStaffOrAdmin);

router.get('/dashboard', (req, res) => reportController.getDashboardStats(req, res));

export default router;
