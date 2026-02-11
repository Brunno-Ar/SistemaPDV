import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, getBucketConfig } from "./aws-config";

const s3Client = createS3Client();

/**
 * Upload file to S3
 * @param buffer File buffer
 * @param fileName File name/key
 * @returns S3 key (cloud_storage_path)
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const { bucketName, folderPrefix } = getBucketConfig();

  // Generate unique key with folder prefix
  const key = `${folderPrefix}${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
  });

  await s3Client.send(command);

  return key; // Return cloud_storage_path
}

/**
 * Get signed URL for downloading/viewing file
 * @param key S3 key (cloud_storage_path)
 * @param expiresIn Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL
 */
export async function getFileUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  const { bucketName } = getBucketConfig();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return signedUrl;
}

/**
 * Delete file from S3
 * @param key S3 key (cloud_storage_path)
 */
export async function deleteFile(key: string): Promise<void> {
  const { bucketName } = getBucketConfig();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
}
