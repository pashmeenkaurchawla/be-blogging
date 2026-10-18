import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisConfigService {
  constructor(private readonly config: ConfigService) {}

  get host(): string {
    return this.config.get<string>('redis.host');
  }

  get port(): number {
    return this.config.get<number>('redis.port');
  }

  get password(): string {
    return this.config.get<string>('redis.password');
  }
}
