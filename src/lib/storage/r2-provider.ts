import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, getR2BucketName } from "./r2-client";
import type { StorageProvider } from "./provider";

const PRESIGN_UPLOAD_EXPIRY_SECONDS = 60;
const PRESIGN_VIEW_EXPIRY_SECONDS = 60 * 60; // hakem/yarışmacı raporu incelerken yeterli

export class R2StorageProvider implements StorageProvider {
  async createUploadUrl(key: string, contentType: string, fileSize: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
      ContentType: contentType,
      ContentLength: fileSize,
    });
    return getSignedUrl(getR2Client(), command, { expiresIn: PRESIGN_UPLOAD_EXPIRY_SECONDS });
  }

  async headObject(key: string): Promise<{ contentLength: number } | null> {
    try {
      const head = await getR2Client().send(
        new HeadObjectCommand({ Bucket: getR2BucketName(), Key: key })
      );
      return head.ContentLength != null ? { contentLength: head.ContentLength } : null;
    } catch {
      return null;
    }
  }

  async createViewUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: getR2BucketName(), Key: key });
    return getSignedUrl(getR2Client(), command, { expiresIn: PRESIGN_VIEW_EXPIRY_SECONDS });
  }

  async getObjectBytes(key: string): Promise<Uint8Array> {
    const response = await getR2Client().send(
      new GetObjectCommand({ Bucket: getR2BucketName(), Key: key })
    );
    if (!response.Body) {
      throw new Error(`R2 nesnesi bulunamadı: ${key}`);
    }
    return response.Body.transformToByteArray();
  }

  async deleteObject(key: string): Promise<void> {
    await getR2Client().send(new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: key }));
  }
}
