import { Readable } from 'stream';

export interface IStorageService {
  uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ key: string; size: number }>;

  downloadStream(key: string): Promise<Readable>;

  downloadBuffer(key: string): Promise<Buffer>;

  deleteFile(key: string): Promise<void>;

  fileExists(key: string): Promise<boolean>;

  calculateSha256(buffer: Buffer): string;
}
