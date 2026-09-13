import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { IStorageService } from './storage.interface';

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageDir: string;

  constructor(private readonly configService: ConfigService) {
    this.storageDir = path.resolve(process.cwd(), 'private-storage');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private getSafePath(key: string): string {
    const sanitizedKey = key.replace(/\\/g, '/').replace(/\.\./g, '');
    const targetPath = path.resolve(this.storageDir, sanitizedKey);
    if (!targetPath.startsWith(this.storageDir)) {
      throw new Error('Invalid storage key: path traversal detected');
    }
    return targetPath;
  }

  calculateSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ key: string; size: number }> {
    const targetPath = this.getSafePath(key);
    const parentDir = path.dirname(targetPath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    await fs.promises.writeFile(targetPath, buffer);
    this.logger.log(`File uploaded securely to key: ${key} (${buffer.length} bytes, ${mimeType})`);

    return {
      key,
      size: buffer.length,
    };
  }

  async downloadStream(key: string): Promise<Readable> {
    const targetPath = this.getSafePath(key);
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException(`Storage object with key "${key}" not found`);
    }
    return fs.createReadStream(targetPath);
  }

  async downloadBuffer(key: string): Promise<Buffer> {
    const targetPath = this.getSafePath(key);
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException(`Storage object with key "${key}" not found`);
    }
    return fs.promises.readFile(targetPath);
  }

  async deleteFile(key: string): Promise<void> {
    const targetPath = this.getSafePath(key);
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
      this.logger.log(`Storage object deleted: ${key}`);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const targetPath = this.getSafePath(key);
      return fs.existsSync(targetPath);
    } catch {
      return false;
    }
  }

  async checkBucketExists(): Promise<boolean> {
    try {
      return fs.existsSync(this.storageDir);
    } catch {
      return false;
    }
  }
}
