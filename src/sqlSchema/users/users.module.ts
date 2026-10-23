import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from 'src/sqlSchema/users/user.entity';
import { UsersService } from 'src/sqlSchema/users/users.service';
import { AppConfigService } from 'src/config/app-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      useFactory: (appConfig: AppConfigService) => ({
        secret: appConfig.jwtSecret,
        signOptions: { expiresIn: appConfig.jwtExpiry },
      }),
      inject: [AppConfigService],
    }),
  ],
  providers: [UsersService],
  exports: [UsersService, JwtModule],
})
export class UsersModule {}
