import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get nodeEnv(): string {
    return this.config.get<string>('app.nodeEnv');
  }

  get port(): number {
    return this.config.get<number>('app.port');
  }

  get logLevel(): string {
    return this.config.get<string>('app.logLevel');
  }

  get jwtSecret(): string {
    return this.config.get<string>('app.jwtSecret');
  }

  get jwtExpiry(): string {
    return this.config.get<string>('app.jwtExpiry');
  }

  get bcryptSaltRounds(): number {
    return this.config.get<number>('app.bcryptSaltRounds');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}
