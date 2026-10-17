import { Router } from 'express';
import { feedbackController } from '../controllers/feedbackController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { submitFeedbackSchema } from '../validators';

const router = Router();

// Public feedback list
router.get('/', (req, res) => feedbackController.list(req, res));

// Submit feedback (Client)
router.post('/request/:requestId', authenticate, validateBody(submitFeedbackSchema), (req, res) => feedbackController.submit(req, res));

export default router;
