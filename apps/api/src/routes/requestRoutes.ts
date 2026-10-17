import { Router } from 'express';
import { requestController } from '../controllers/requestController';
import { authenticate, requireStaffOrAdmin, checkRequestAccess } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createServiceRequestSchema,
  updateRequestStatusSchema,
  assignStaffSchema,
  updatePrioritySchema,
} from '../validators';

const router = Router();

router.use(authenticate);

// List and Create
router.get('/', (req, res) => requestController.list(req, res));
router.post('/', validateBody(createServiceRequestSchema), (req, res) => requestController.create(req, res));
router.get('/export/csv', requireStaffOrAdmin, (req, res) => requestController.exportCsv(req, res));

// Single Request Operations with IDOR protection
router.get('/:id', checkRequestAccess, (req, res) => requestController.getById(req, res));
router.patch('/:id/status', requireStaffOrAdmin, validateBody(updateRequestStatusSchema), (req, res) => requestController.updateStatus(req, res));
router.patch('/:id/assign', requireStaffOrAdmin, validateBody(assignStaffSchema), (req, res) => requestController.assignStaff(req, res));
router.patch('/:id/priority', requireStaffOrAdmin, validateBody(updatePrioritySchema), (req, res) => requestController.updatePriority(req, res));
router.delete('/:id', requireStaffOrAdmin, (req, res) => requestController.delete(req, res));

export default router;
