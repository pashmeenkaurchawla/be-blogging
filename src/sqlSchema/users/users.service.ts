import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { BaseResourceService } from '../base-resource-service';
import { User } from './user.entity';
import { UserStatus } from '../utils/enums/user-status.enum';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class UsersService extends BaseResourceService<User> {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly appConfig: AppConfigService,
  ) {
    super(usersRepository);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findByUserName(userName: string): Promise<User | null> {
    return this.repository.findOne({ where: { userName } });
  }

  async signup(dto: {
    name: string;
    userName: string;
    email: string;
    password: string;
  }): Promise<User> {
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

    return super.create({
      name: dto.name,
      userName: dto.userName,
      email: dto.email,
      password: hashedPassword,
    });
  }

  async validateCredentials(
    userName: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.findByUserName(userName);
    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? user : null;
  }

  async updateLastLogin(userId: number): Promise<void> {
    await this.repository.update(userId, {
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

  async resetLoginAttempts(userId: number): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;

    user.failedLoginAttempts = 0;
    user.firstFailedLoginAt = null;
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
