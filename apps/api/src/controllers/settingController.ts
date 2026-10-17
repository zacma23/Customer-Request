import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { recordAuditLog } from '../utils/audit';

export class SettingController {
  public async getAll(req: Request, res: Response): Promise<void> {
    const settings = await prisma.setting.findMany();
    const formatted: Record<string, any> = {};

    for (const s of settings) {
      try {
        formatted[s.key] = JSON.parse(s.value);
      } catch {
        formatted[s.key] = s.value;
      }
    }

    res.json({
      success: true,
      data: formatted,
    });
  }

  public async update(req: Request, res: Response): Promise<void> {
    const key = req.params.key as string;
    const { value, description } = req.body;
    const user = req.user!;

    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    const setting = await prisma.setting.upsert({
      where: { key },
      update: {
        value: stringValue,
        description,
        updatedByUserId: user.id,
      },
      create: {
        key,
        value: stringValue,
        description,
        updatedByUserId: user.id,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: 'UPDATE_SETTING',
      resourceType: 'Setting',
      resourceId: key,
      details: { key, value },
      req,
    });

    res.json({
      success: true,
      data: setting,
      message: `Setting ${key} updated successfully`,
    });
  }
}

export const settingController = new SettingController();
