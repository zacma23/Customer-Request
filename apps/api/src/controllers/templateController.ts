import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { recordAuditLog } from '../utils/audit';

export class TemplateController {
  public async list(req: Request, res: Response): Promise<void> {
    const { category } = req.query as Record<string, string>;
    const where: any = {};
    if (category) {
      where.category = category;
    }

    const templates = await prisma.replyTemplate.findMany({
      where,
      orderBy: { title: 'asc' },
    });

    res.json({
      success: true,
      data: templates,
    });
  }

  public async create(req: Request, res: Response): Promise<void> {
    const { title, category, content, placeholders } = req.body;
    const user = req.user!;

    const template = await prisma.replyTemplate.create({
      data: {
        title,
        category,
        content,
        placeholders: placeholders ? JSON.stringify(placeholders) : null,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: 'CREATE_TEMPLATE',
      resourceType: 'ReplyTemplate',
      resourceId: template.id,
      details: { title, category },
      req,
    });

    res.status(201).json({
      success: true,
      data: template,
    });
  }

  public async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { title, category, content, placeholders } = req.body;
    const user = req.user!;

    const updated = await prisma.replyTemplate.update({
      where: { id },
      data: {
        title,
        category,
        content,
        placeholders: placeholders ? JSON.stringify(placeholders) : undefined,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: 'UPDATE_TEMPLATE',
      resourceType: 'ReplyTemplate',
      resourceId: id,
      req,
    });

    res.json({
      success: true,
      data: updated,
    });
  }

  public async delete(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    await prisma.replyTemplate.delete({ where: { id } });

    await recordAuditLog({
      userId: req.user!.id,
      action: 'DELETE_TEMPLATE',
      resourceType: 'ReplyTemplate',
      resourceId: id,
      req,
    });

    res.json({ success: true, message: 'Template deleted' });
  }
}

export const templateController = new TemplateController();
