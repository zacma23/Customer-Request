import { getStore } from '@netlify/blobs';

const ATTACHMENTS_STORE_NAME = 'customer-attachments';

export function getAttachmentsStore() {
  return getStore(ATTACHMENTS_STORE_NAME);
}

export async function uploadToBlobs(
  key: string,
  data: Buffer | ArrayBuffer | string,
  metadata?: { fileName: string; mimeType: string; uploadedBy?: string }
): Promise<string> {
  const store = getAttachmentsStore();
  await store.set(key, data, {
    metadata: metadata || {},
  });
  return key;
}

export async function getFromBlobs(key: string): Promise<{ data: ArrayBuffer | null; metadata?: any }> {
  const store = getAttachmentsStore();
  const entry = await store.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!entry) return { data: null };
  return {
    data: entry.data,
    metadata: entry.metadata,
  };
}

export async function deleteFromBlobs(key: string): Promise<void> {
  const store = getAttachmentsStore();
  await store.delete(key);
}
