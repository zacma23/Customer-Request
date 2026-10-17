import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { authenticate, checkRequestAccess } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendMessageSchema } from '../validators';

const router = Router();

router.use(authenticate);

router.get('/request/:requestId', checkRequestAccess, (req, res) => messageController.listByRequest(req, res));
router.post('/request/:requestId', checkRequestAccess, validateBody(sendMessageSchema), (req, res) => messageController.send(req, res));

export default router;
