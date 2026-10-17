import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireStaffOrAdmin);

router.post('/request/:requestId/draft-reply', (req, res) => aiController.draftReply(req, res));
router.post('/request/:requestId/summarize', (req, res) => aiController.summarize(req, res));
router.get('/request/:requestId/suggest-action', (req, res) => aiController.suggestNextAction(req, res));
router.post('/request/:requestId/quotation', (req, res) => aiController.generateQuotation(req, res));

export default router;
