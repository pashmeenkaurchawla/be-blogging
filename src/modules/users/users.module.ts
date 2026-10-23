import { Module } from '@nestjs/common';
import { SqlSchemaModule } from 'src/sqlSchema/sql-schema.module';
import { UsersController } from 'src/modules/users/users.controller';
import { RedisModule } from 'src/core/database/redis/redis.module';

@Module({
  imports: [SqlSchemaModule, RedisModule],
  controllers: [UsersController],
})
export class UsersFeatureModule {}
