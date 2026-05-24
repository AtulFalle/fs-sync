import { Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';

@Injectable()
export class StorageService {
  async putObject(
    _key: string,
    _body: Buffer | Readable,
    _contentType: string,
  ): Promise<void> {
    throw new Error('Object storage is intentionally not implemented yet.');
  }

  getObjectUrl(key: string): string {
    return key;
  }
}
