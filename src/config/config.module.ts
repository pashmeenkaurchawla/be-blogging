import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { appConfig, sqlConfig, redisConfig } from 'src/config/app.config';
import { AppConfigService } from 'src/config/app-config.service';
import { SqlConfigService } from 'src/config/sql-config.service';
import { RedisConfigService } from 'src/config/redis-config.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, sqlConfig, redisConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        LOG_LEVEL: Joi.string()
          .valid('error', 'warn', 'info', 'debug', 'verbose')
          .default('info'),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRY: Joi.string().default('30m'),
        BCRYPT_SALT_ROUNDS: Joi.number().default(10),
        SQL_HOST: Joi.string().default('localhost'),
        SQL_PORT: Joi.number().default(3306),
        SQL_USERNAME: Joi.string().default('root'),
        SQL_PASSWORD: Joi.string().allow('').default(''),
        SQL_DATABASE: Joi.string().default('blogging'),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().allow('').default(''),
      }),
    }),
  ],
  providers: [AppConfigService, SqlConfigService, RedisConfigService],
  exports: [AppConfigService, SqlConfigService, RedisConfigService],
})
export class ConfigModule {}
