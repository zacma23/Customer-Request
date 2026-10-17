import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { submitPaymentProofSchema, verifyPaymentProofSchema } from '../validators';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => paymentController.listAll(req, res));
router.post('/proof', validateBody(submitPaymentProofSchema), (req, res) => paymentController.submitProof(req, res));
router.patch('/:id/verify', requireStaffOrAdmin, validateBody(verifyPaymentProofSchema), (req, res) => paymentController.verifyProof(req, res));

export default router;
