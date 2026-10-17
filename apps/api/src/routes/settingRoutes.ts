import { Router } from 'express';
import { settingController } from '../controllers/settingController';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateSettingSchema } from '../validators';

const router = Router();

// Settings can be read by authenticated users (or public branding)
router.get('/', (req, res) => settingController.getAll(req, res));

// Settings modification is strictly restricted to SUPER_ADMIN
router.put('/:key', authenticate, requireSuperAdmin, validateBody(updateSettingSchema), (req, res) => settingController.update(req, res));

export default router;
