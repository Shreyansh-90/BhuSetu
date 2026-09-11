import 'server-only';
import * as Minio from 'minio';
import { env } from '../env';

const minioConfigured = Boolean(
  env.MINIO_ENDPOINT && env.MINIO_ACCESS_KEY && env.MINIO_SECRET_KEY,
);

// MinIO is paused for now. Do not create a client with undefined credentials.
export const minioClient = minioConfigured
  ? new Minio.Client({
      endPoint: env.MINIO_ENDPOINT!,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY!,
      secretKey: env.MINIO_SECRET_KEY!,
    })
  : null;

export function requireMinioClient(): Minio.Client {
  if (!minioClient) {
    throw new Error(
      'MinIO storage is not configured. Storage features are currently disabled.',
    );
  }

  return minioClient;
}

const DEFAULT_EXPIRY = 60 * 60; // 1 hour

export async function generateUploadUrl(objectKey: string, mimeType: string): Promise<string> {
  const client = requireMinioClient();
  // Using presignedPutObject
  return client.presignedPutObject(env.MINIO_BUCKET, objectKey, DEFAULT_EXPIRY);
}

export async function generateDownloadUrl(objectKey: string, filename: string): Promise<string> {
  const client = requireMinioClient();
  // Set Content-Disposition for download
  const reqParams = {
    'response-content-disposition': `attachment; filename="${filename}"`,
  };
  return client.presignedGetObject(env.MINIO_BUCKET, objectKey, DEFAULT_EXPIRY, reqParams);
}

export async function verifyObject(objectKey: string): Promise<{ size: number; etag: string }> {
  const client = requireMinioClient();
  const stat = await client.statObject(env.MINIO_BUCKET, objectKey);
  return {
    size: stat.size,
    etag: stat.etag,
  };
}
