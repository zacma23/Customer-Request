import type { Handler, HandlerEvent } from '@netlify/functions';
import { prisma } from '../lib/db';
import { json, error, unauthorized, notFound, handleOptions } from '../lib/response';
import { getAuthUser } from '../lib/auth';
import { uploadToBlobs, getFromBlobs } from '../lib/blobs';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  const cleanPath = event.path
    .replace(/\/?\.netlify\/functions\/uploads\/?/, '')
    .replace(/^\/api\/v1\/uploads\/?/, '');
  const pathParts = cleanPath.split('/').filter(Boolean);

  try {
    // 1. GET /uploads/:key (Stream file from Netlify Blobs)
    if (event.httpMethod === 'GET' && pathParts.length > 0) {
      const fileKey = pathParts[0];

      const attachment = await prisma.attachment.findFirst({
        where: { fileKey },
      });
      if (!attachment) return notFound('Attachment not found');

      const { data, metadata } = await getFromBlobs(fileKey);
      if (!data) return notFound('File blob not found in storage');

      return {
        statusCode: 200,
        headers: {
          'Content-Type': attachment.mimeType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${attachment.fileName}"`,
          'Cache-Control': 'private, max-age=3600',
        },
        body: Buffer.from(data).toString('base64'),
        isBase64Encoded: true,
      };
    }

    // 2. POST /uploads (Upload file base64 or multipart)
    if (event.httpMethod === 'POST') {
      const authUser = await getAuthUser(event);
      if (!authUser) {
        return unauthorized('Authentication required to upload files');
      }

      const body = JSON.parse(event.body || '{}');
      const { fileName, mimeType, base64Data, serviceRequestId, messageId } = body;

      if (!fileName || !base64Data) {
        return error(400, 'fileName and base64Data are required', 'MISSING_DATA');
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const fileSize = buffer.length;

      // Enforce 5 MB function limit
      if (fileSize > 5 * 1024 * 1024) {
        return error(413, 'File size exceeds maximum allowed 5 MB limit', 'FILE_TOO_LARGE');
      }

      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
      ];
      const validMime = allowedMimes.includes(mimeType) ? mimeType : 'application/octet-stream';

      const fileKey = `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      // Upload to Netlify Blobs private store
      await uploadToBlobs(fileKey, buffer, {
        fileName,
        mimeType: validMime,
        uploadedBy: authUser.id,
      });

      // Save metadata in database
      const attachment = await prisma.attachment.create({
        data: {
          fileName,
          fileKey,
          mimeType: validMime,
          fileSize,
          serviceRequestId: serviceRequestId || null,
          messageId: messageId || null,
          uploadedByUserId: authUser.id,
        },
      });

      return json(201, {
        id: attachment.id,
        fileName: attachment.fileName,
        fileKey: attachment.fileKey,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        url: `/api/v1/uploads/${attachment.fileKey}`,
      });
    }

    return error(404, 'Endpoint not found', 'NOT_FOUND');
  } catch (err: any) {
    console.error('Uploads function error:', err);
    return error(500, err?.message || 'Server error', 'SERVER_ERROR');
  }
};
