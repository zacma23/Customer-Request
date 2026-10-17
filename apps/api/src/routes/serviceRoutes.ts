import { Router } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

// Public list of active services for landing page & dropdowns
router.get('/', async (req, res) => {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { startingPrice: 'asc' },
  });

  res.json({
    success: true,
    data: services,
  });
});

export default router;
