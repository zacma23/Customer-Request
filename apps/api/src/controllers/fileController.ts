import { Request, Response } from 'express';
import { storageService } from '../services/storage';
import { prisma } from '../utils/prisma';
import fs from 'fs';
import path from 'path';
import { Role } from '@prisma/client';

export class FileController {
  /**
   * Upload File (Authenticated)
   */
  public async upload(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { message: 'No file provided in form-data field "file"', code: 'MISSING_FILE' },
      });
      return;
    }

    const { serviceRequestId, messageId } = req.body;
    const user = req.user;

    const stored = await storageService.saveFile(req.file);

    const attachment = await prisma.attachment.create({
      data: {
        fileName: stored.fileName,
        fileKey: stored.fileKey,
        mimeType: stored.mimeType,
        fileSize: stored.fileSize,
        serviceRequestId: serviceRequestId || null,
        messageId: messageId || null,
        uploadedByUserId: user?.id || null,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        url: stored.url,
      },
      message: 'File uploaded successfully',
    });
  }

  /**
   * Secure Download via Signed URL Token or Session Auth
   */
  public async download(req: Request, res: Response): Promise<void> {
    const fileKey = req.params.fileKey as string;
    const { token, expires } = req.query as Record<string, string>;

    let isAuthorized = false;

    // Check signed token
    if (token && expires) {
      isAuthorized = storageService.verifySignedToken(fileKey, token, parseInt(expires, 10));
    }

    // Check session auth if token missing or invalid
    if (!isAuthorized && req.user) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        error: { message: 'Invalid or expired file access token', code: 'FORBIDDEN' },
      });
      return;
    }

    try {
      const filePath = storageService.getFilePath(fileKey);
      res.sendFile(filePath);
    } catch (err: any) {
      res.status(404).json({
        success: false,
        error: { message: 'File not found on storage server', code: 'NOT_FOUND' },
      });
    }
  }
}

export const fileController = new FileController();
