import { Router } from 'express';
import { meetingController } from '../controllers/meetingController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/:meetingId/respond', (req, res) => meetingController.respond(req, res));

export default router;
