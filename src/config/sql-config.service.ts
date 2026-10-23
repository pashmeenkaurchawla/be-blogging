import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SqlConfigService {
  constructor(private readonly config: ConfigService) {}

  get host(): string {
    return this.config.get<string>('sql.host');
  }

  get port(): number {
    return this.config.get<number>('sql.port');
  }

  get username(): string {
    return this.config.get<string>('sql.username');
  }

  get password(): string {
    return this.config.get<string>('sql.password');
  }

  get database(): string {
    return this.config.get<string>('sql.database');
  }
}
