import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface StoredFileResult {
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  url: string;
}

export interface IStorageService {
  saveFile(file: Express.Multer.File): Promise<StoredFileResult>;
  getFilePath(fileKey: string): string;
  deleteFile(fileKey: string): Promise<void>;
  generateSignedUrl(fileKey: string, expiresInSeconds?: number): string;
  verifySignedToken(fileKey: string, token: string, expires: number): boolean;
}

export class LocalStorageService implements IStorageService {
  private baseDir: string;
  private signSecret: string;

  constructor() {
    this.baseDir = path.resolve(config.storage.localPath);
    this.signSecret = config.jwt.accessSecret;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public async saveFile(file: Express.Multer.File): Promise<StoredFileResult> {
    // 1. Validate MIME type
    if (!config.storage.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed. Supported: ${config.storage.allowedMimeTypes.join(', ')}`);
    }

    // 2. Validate Size
    const maxBytes = config.storage.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error(`File size exceeds maximum limit of ${config.storage.maxFileSizeMb} MB`);
    }

    // 3. Virus-safe, sanitized unique filename
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9\.]/g, '') || '.bin';
    const safeBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 50);
    const uniqueKey = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${safeBaseName}${ext}`;

    const destinationPath = path.join(this.baseDir, uniqueKey);

    // Write file to disk
    if (file.buffer) {
      await fs.promises.writeFile(destinationPath, file.buffer);
    } else if (file.path) {
      await fs.promises.rename(file.path, destinationPath);
    } else {
      throw new Error('No file buffer or path provided');
    }

    const signedUrl = this.generateSignedUrl(uniqueKey, 86400); // 24 hours signed URL

    return {
      fileKey: uniqueKey,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      url: signedUrl,
    };
  }

  public getFilePath(fileKey: string): string {
    // Prevent directory traversal attacks
    const sanitizedKey = path.basename(fileKey);
    const fullPath = path.join(this.baseDir, sanitizedKey);

    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found on storage disk');
    }

    return fullPath;
  }

  public async deleteFile(fileKey: string): Promise<void> {
    try {
      const fullPath = this.getFilePath(fileKey);
      await fs.promises.unlink(fullPath);
    } catch (err: any) {
      logger.warn({ err, fileKey }, 'File deletion skipped or file not found');
    }
  }

  public generateSignedUrl(fileKey: string, expiresInSeconds = 3600): string {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const dataToSign = `${fileKey}:${expires}`;
    const token = crypto
      .createHmac('sha256', this.signSecret)
      .update(dataToSign)
      .digest('hex');

    return `${config.apiBaseUrl}/api/v1/files/download/${encodeURIComponent(fileKey)}?token=${token}&expires=${expires}`;
  }

  public verifySignedToken(fileKey: string, token: string, expires: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    if (now > expires) {
      return false;
    }

    const dataToSign = `${fileKey}:${expires}`;
    const expectedToken = crypto
      .createHmac('sha256', this.signSecret)
      .update(dataToSign)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  }
}

export const storageService: IStorageService = new LocalStorageService();
