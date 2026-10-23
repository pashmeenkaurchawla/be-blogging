import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { BaseResourceService } from 'src/sqlSchema/base-resource-service';
import { User } from 'src/sqlSchema/users/user.entity';
import { UserStatus } from 'src/sqlSchema/utils/enums/user-status.enum';
import { AppConfigService } from 'src/config/app-config.service';
import { LoggerService } from 'src/core/logger/logger.service';

@Injectable()
export class UsersService extends BaseResourceService<User> {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly appConfig: AppConfigService,
    private readonly logger: LoggerService,
    private readonly jwtService: JwtService,
  ) {
    super(usersRepository);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findByUserName(userName: string): Promise<User | null> {
    return this.repository.findOne({ where: { userName } });
  }

  async findByIdOrFail(id: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async signup(dto: {
    name: string;
    userName: string;
    email: string;
    password: string;
  }): Promise<User> {
    this.logger.log(`Signup attempt: ${dto.userName}`, 'UsersService');

    const existingUserName = await this.findByUserName(dto.userName);
    if (existingUserName) {
      throw new ConflictException('Username already taken');
    }

    const existingEmail = await this.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      this.appConfig.bcryptSaltRounds,
    );

    const user = await this.create({
      name: dto.name,
      userName: dto.userName,
      email: dto.email,
      password: hashedPassword,
    });

    this.logger.log(`User created: ${user.id}`, 'UsersService');
    return user;
  }

  async login(dto: {
    userName: string;
    password: string;
  }): Promise<{ accessToken: string; user: User }> {
    this.logger.log(`Login attempt: ${dto.userName}`, 'UsersService');

    let user = await this.findByUserName(dto.userName);
    if (!user) {
      this.logger.warn(`Login failed — unknown user: ${dto.userName}`, 'UsersService');
      throw new UnauthorizedException('Invalid credentials');
    }

    user = await this.unblockIfExpired(user);

    if (this.isBlocked(user)) {
      this.logger.warn(`Login blocked — account locked: ${user.id}`, 'UsersService');
      throw new ForbiddenException('Account is temporarily blocked');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      this.logger.warn(`Login failed — wrong password: ${user.id}`, 'UsersService');
      await this.recordFailedLogin(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.onLoginSuccess(user.id);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      userName: user.userName,
    });

    this.logger.log(`Login success: ${user.id}`, 'UsersService');
    return { accessToken, user };
  }

  private async onLoginSuccess(userId: number): Promise<void> {
    await this.repository.update(userId, {
      failedLoginAttempts: 0,
      firstFailedLoginAt: null,
      lastLoginAt: new Date(),
    } as any);
  }

  async recordFailedLogin(userId: number): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    if (user.firstFailedLoginAt && user.firstFailedLoginAt < fiveMinutesAgo) {
      user.failedLoginAttempts = 0;
      user.firstFailedLoginAt = null;
    }

    user.failedLoginAttempts += 1;

    if (!user.firstFailedLoginAt) {
      user.firstFailedLoginAt = now;
    }

    if (user.failedLoginAttempts >= 5) {
      user.blockedUntil = new Date(now.getTime() + 30 * 60 * 1000);
      user.status = UserStatus.BLOCKED;
    }

    await this.repository.save(user);
  }

  isBlocked(user: User): boolean {
    return !!user.blockedUntil && user.blockedUntil > new Date();
  }

  async unblockIfExpired(user: User): Promise<User> {
    if (user.blockedUntil && user.blockedUntil <= new Date()) {
      user.status = UserStatus.ACTIVE;
      user.blockedUntil = null;
      user.failedLoginAttempts = 0;
      user.firstFailedLoginAt = null;
      return this.repository.save(user);
    }
    return user;
  }
}
