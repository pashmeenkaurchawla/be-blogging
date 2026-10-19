import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SqlSchemaModule } from '../sqlSchema/sql-schema.module';
import { RedisModule } from '../core/database/redis/redis.module';
import { AppConfigService } from '../config/app-config.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    SqlSchemaModule,
    RedisModule,
    JwtModule.registerAsync({
      useFactory: (appConfig: AppConfigService) => ({
        secret: appConfig.jwtSecret,
        signOptions: { expiresIn: appConfig.jwtExpiry },
      }),
      inject: [AppConfigService],
    }),
  ],
  controllers: [UsersController],
  exports: [JwtModule],
})
export class UsersFeatureModule {}
