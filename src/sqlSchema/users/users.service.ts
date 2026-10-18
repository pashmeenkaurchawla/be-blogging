import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseResourceService } from '../base-resource-service';
import { User } from './user.entity';

@Injectable()
export class UsersService extends BaseResourceService<User> {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    super(usersRepository);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findByUserName(userName: string): Promise<User | null> {
    return this.repository.findOne({ where: { userName } });
  }
}
