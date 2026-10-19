import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SqlSchemaModule } from '../../sqlSchema/sql-schema.module';
import { RedisModule } from '../database/redis/redis.module';
import { AppConfigService } from '../../config/app-config.service';
import { JwtAuthGuard } from './jwt-auth.guard';

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
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
