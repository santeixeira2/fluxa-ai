import { Client } from 'minio';

const endpoint = process.env.MINIO_ENDPOINT ?? 'http://minio:9000';
const url = new URL(endpoint);

export const minioClient = new Client({
  endPoint: url.hostname,
  port: parseInt(url.port || (url.protocol === 'https:' ? '443' : '80')),
  useSSL: url.protocol === 'https:',
  accessKey: process.env.MINIO_ACCESS_KEY ?? '',
  secretKey: process.env.MINIO_SECRET_KEY ?? '',
});

export const AVATAR_BUCKET = process.env.MINIO_BUCKET ?? 'fluxa-files';

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(AVATAR_BUCKET);
  if (!exists) await minioClient.makeBucket(AVATAR_BUCKET);
}
