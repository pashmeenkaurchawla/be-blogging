import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Check,
  Index,
} from 'typeorm';
import { BaseEntity } from '../interfaces/base.entity';
import { User } from '../users/user.entity';
import { PostStatus } from '../utils/enums/post-status.enum';

@Entity('posts')
@Check('CHK_post_status', 'status IN (-1, 0, 1)')
@Index('IDX_post_author', ['authorId'])
@Index('IDX_post_status', ['status'])
export class Post extends BaseEntity {

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: number;

  @Column({ type: 'varchar', length: 512, nullable: false })
  title: string;

  @Column({ type: 'mediumtext', nullable: false })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'tinyint', default: PostStatus.ACTIVE })
  status: PostStatus;
}
