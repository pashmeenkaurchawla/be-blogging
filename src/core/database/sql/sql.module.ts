import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqlService } from './sql.service';
import { SqlConfigService } from '../../../config/sql-config.service';
import { AppConfigService } from '../../../config/app-config.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (
        sqlConfig: SqlConfigService,
        appConfig: AppConfigService,
      ) => ({
        type: 'mysql',
        host: sqlConfig.host,
        port: sqlConfig.port,
        username: sqlConfig.username,
        password: sqlConfig.password,
        database: sqlConfig.database,
        autoLoadEntities: true,
        synchronize: !appConfig.isProduction,
        retryAttempts: 0,
      }),
      inject: [SqlConfigService, AppConfigService],
    }),
  ],
  providers: [SqlService],
  exports: [SqlService],
})
export class SqlModule {}
