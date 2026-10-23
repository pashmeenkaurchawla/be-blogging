import { User } from 'src/sqlSchema/users/user.entity';

export class UserResponseDto {
  id: number;
  name: string;
  userName: string;
  email: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.userName = user.userName;
    dto.email = user.email;
    dto.lastLoginAt = user.lastLoginAt;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
