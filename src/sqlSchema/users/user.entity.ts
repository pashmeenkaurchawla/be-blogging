import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
  Unique,
  Index,
} from 'typeorm';
import { BaseEntity } from 'src/sqlSchema/interfaces/base.entity';
import { UserStatus } from 'src/sqlSchema/utils/enums/user-status.enum';

@Entity('users')
@Check('CHK_user_status', 'status IN (-1, 0, 1)')
@Unique('UQ_user_userName', ['userName'])
@Index('IDX_user_status', ['status'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  userName: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  password: string;

  @Column({ type: 'datetime', nullable: true, default: null })
  lastLoginAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'tinyint', default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'smallint', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'datetime', nullable: true, default: null })
  firstFailedLoginAt: Date | null;

  @Column({ type: 'datetime', nullable: true, default: null })
  blockedUntil: Date | null;
}
