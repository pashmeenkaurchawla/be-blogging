import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from 'src/core/database/redis/redis.service';
import { UsersService } from 'src/sqlSchema/users/users.service';
import { UserStatus } from 'src/sqlSchema/utils/enums/user-status.enum';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.slice(7);
    const cacheKey = `jwt:${token}`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        request.user = JSON.parse(cached);
        return true;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException();
      }

      const userData = { id: user.id, userName: user.userName };
      await this.redisService.set(cacheKey, JSON.stringify(userData), 300);
      request.user = userData;

      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
