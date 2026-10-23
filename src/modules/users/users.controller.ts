import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from 'src/sqlSchema/users/users.service';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';
import { LoginDto } from 'src/modules/users/dto/login.dto';
import { UserResponseDto } from 'src/modules/users/dto/user-response.dto';
import { JwtAuthGuard } from 'src/core/auth/jwt-auth.guard';

@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  async signup(@Body() dto: CreateUserDto) {
    const user = await this.usersService.signup(dto);
    return UserResponseDto.fromEntity(user);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const { accessToken, user } = await this.usersService.login(dto);
    return { accessToken, user: UserResponseDto.fromEntity(user) };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findByIdOrFail(id);
    return UserResponseDto.fromEntity(user);
  }
}
