import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LoggerService } from 'src/core/logger/logger.service';

@Injectable()
export class SqlService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }
      this.logger.log('SQL database connected successfully', 'SqlService');
    } catch (err) {
      this.logger.error(
        '================================================',
        undefined, //why.stack, .message is ot working on exception
        'SqlService',
      );
      this.logger.error(
        `FAILED TO CONNECT TO SQL DATABASE: ${err.message}`,
        err.stack,
        'SqlService',
      );
      this.logger.error(
        '================================================',
        undefined,
        'SqlService',
      );
    }
  }

  async onModuleDestroy() {
    if (this.dataSource?.isInitialized) {
      this.logger.log('Closing SQL database connection...', 'SqlService');
      await this.dataSource.destroy();
      this.logger.log('SQL database connection closed', 'SqlService');
    }
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }

  isConnected(): boolean {
    return this.dataSource?.isInitialized ?? false;
  }
}
