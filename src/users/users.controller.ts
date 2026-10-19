import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../sqlSchema/users/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../core/auth/jwt-auth.guard';

@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('signup')
  async signup(@Body() dto: CreateUserDto) {
    const user = await this.usersService.signup(dto);
    return UserResponseDto.fromEntity(user);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    let user = await this.usersService.findByUserName(dto.userName);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user = await this.usersService.unblockIfExpired(user);

    if (this.usersService.isBlocked(user)) {
      throw new ForbiddenException('Account is temporarily blocked');
    }

    const validated = await this.usersService.validateCredentials(
      dto.userName,
      dto.password,
    );

    if (!validated) {
      await this.usersService.recordFailedLogin(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.resetLoginAttempts(user.id);
    await this.usersService.updateLastLogin(user.id);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      userName: user.userName,
    });

    return {
      accessToken,
      user: UserResponseDto.fromEntity(validated),
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return UserResponseDto.fromEntity(user);
  }
}
