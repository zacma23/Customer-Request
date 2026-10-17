import { Router } from 'express';
import multer from 'multer';
import { fileController } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { config } from '../config';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.storage.maxFileSizeMb * 1024 * 1024,
  },
});

const router = Router();

// Upload requires authentication
router.post('/upload', authenticate, upload.single('file'), (req, res) => fileController.upload(req, res));

// Download can be accessed with signed token in URL query OR authentication
router.get('/download/:fileKey', (req, res) => fileController.download(req, res));

export default router;
