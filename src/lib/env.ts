import { z } from 'zod';
import 'server-only';

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // MinIO is intentionally optional while the storage integration is paused.
  // If any required MinIO setting is supplied, all required settings must be supplied.
  MINIO_ENDPOINT: z.string().min(1).optional(),
  MINIO_PORT: z.coerce.number().optional().default(9000),
  MINIO_USE_SSL: z.coerce.boolean().optional().default(false),
  MINIO_ACCESS_KEY: z.string().min(1).optional(),
  MINIO_SECRET_KEY: z.string().min(1).optional(),
  MINIO_BUCKET: z.string().min(1).default('bhu-setu'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
}).superRefine((values, context) => {
  const minioRequiredValues = [
    values.MINIO_ENDPOINT,
    values.MINIO_ACCESS_KEY,
    values.MINIO_SECRET_KEY,
  ];
  const minioPartiallyConfigured = minioRequiredValues.some(Boolean);
  const minioIncomplete = minioRequiredValues.some((value) => !value);

  if (minioPartiallyConfigured && minioIncomplete) {
    context.addIssue({
      code: 'custom',
      path: ['MINIO_ENDPOINT'],
      message: 'MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY must be provided together.',
    });
  }
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().min(1),
});

const processEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
  MINIO_PORT: process.env.MINIO_PORT,
  MINIO_USE_SSL: process.env.MINIO_USE_SSL,
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
  MINIO_BUCKET: process.env.MINIO_BUCKET,
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
};

let serverEnv: z.infer<typeof serverSchema>;
let clientEnv: z.infer<typeof clientSchema>;

try {
  const parsedServer = serverSchema.safeParse(processEnv);
  const parsedClient = clientSchema.safeParse(processEnv);

  if (!parsedServer.success || !parsedClient.success) {
    const failedKeys = [
      ...(parsedServer.success ? [] : parsedServer.error.issues.map(i => i.path.join('.'))),
      ...(parsedClient.success ? [] : parsedClient.error.issues.map(i => i.path.join('.'))),
    ];
    
    throw new Error(`Invalid environment variables: ${failedKeys.join(', ')}`);
  }

  serverEnv = parsedServer.data;
  clientEnv = parsedClient.data;
} catch (error) {
  if (error instanceof Error) {
    throw new Error(`Environment validation failed. ${error.message}`);
  }
  throw new Error('Environment validation failed with unknown error.');
}

export const env = {
  ...serverEnv,
  ...clientEnv,
};

export const publicEnv = clientEnv;
