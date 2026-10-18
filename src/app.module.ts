import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './core/logger/logger.module';
import { SqlModule } from './core/database/sql/sql.module';
import { RedisModule } from './core/database/redis/redis.module';
import { SqlSchemaModule } from './sqlSchema/sql-schema.module';

@Module({
  imports: [ConfigModule, LoggerModule, SqlModule, RedisModule, SqlSchemaModule],
})
export class AppModule {}
