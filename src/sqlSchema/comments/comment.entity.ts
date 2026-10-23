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
import { BaseEntity } from 'src/sqlSchema/interfaces/base.entity';
import { User } from 'src/sqlSchema/users/user.entity';
import { Post } from 'src/sqlSchema/posts/posts.entity';
import { CommentStatus } from 'src/sqlSchema/utils/enums/comment-status.enum';

@Entity('comments')
@Check('CHK_comment_status', 'status IN (-1, 0, 1)')
@Index('IDX_comment_post', ['postId'])
@Index('IDX_comment_author', ['authorId'])
@Index('IDX_comment_parent', ['parentCommentId'])
@Index('IDX_comment_status', ['status'])
export class Comment extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: number;

  @ManyToOne(() => Post, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column()
  postId: number;

  @ManyToOne(() => Comment, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment: Comment | null;

  @Column({ nullable: true, default: null })
  parentCommentId: number | null; //need to allow only single level nesting - but be ready to answer how multi level nesting can be done

  @Column({ type: 'text', nullable: false })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'tinyint', default: CommentStatus.ACTIVE })
  status: CommentStatus;
}
