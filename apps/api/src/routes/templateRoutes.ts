import { Router } from 'express';
import { templateController } from '../controllers/templateController';
import { authenticate, requireStaffOrAdmin, requireAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { replyTemplateSchema } from '../validators';

const router = Router();

router.use(authenticate);
router.use(requireStaffOrAdmin);

router.get('/', (req, res) => templateController.list(req, res));
router.post('/', requireAdmin, validateBody(replyTemplateSchema), (req, res) => templateController.create(req, res));
router.put('/:id', requireAdmin, validateBody(replyTemplateSchema), (req, res) => templateController.update(req, res));
router.delete('/:id', requireAdmin, (req, res) => templateController.delete(req, res));

export default router;
