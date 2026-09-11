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
