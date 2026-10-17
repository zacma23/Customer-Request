import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { adminCreateUserSchema } from '../validators';

const router = Router();

router.use(authenticate);

// Client & User list (Admin)
router.get('/', requireAdmin, (req, res) => userController.list(req, res));
router.get('/audit-logs', requireSuperAdmin, (req, res) => userController.getAuditLogs(req, res));
router.get('/:id', requireAdmin, (req, res) => userController.getById(req, res));
router.patch('/:id/status', requireAdmin, (req, res) => userController.toggleStatus(req, res));

// Create staff or admin account (SUPER_ADMIN only)
router.post('/staff', requireSuperAdmin, validateBody(adminCreateUserSchema), (req, res) => userController.createStaffOrAdmin(req, res));

export default router;
