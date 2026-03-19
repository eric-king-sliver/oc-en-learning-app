import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'english_learning',
    secretAccessKey: process.env.S3_SECRET_KEY || 'english_learning_dev_secret',
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.S3_BUCKET || 'english-learning-dev';

export async function uploadRecording(
  userId: string,
  audioBuffer: Buffer,
  mimeType: string = 'audio/m4a'
): Promise<string> {
  const key = `recordings/${userId}/${uuidv4()}.m4a`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: audioBuffer,
      ContentType: mimeType,
    })
  );

  return key;
}

export async function getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return `https://${BUCKET_NAME}.${process.env.S3_ENDPOINT?.replace('http://', '')}/${key}`;
}

export function getPublicUrl(key: string): string {
  return `http://localhost:9000/${BUCKET_NAME}/${key}`;
}
