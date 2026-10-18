import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Check,
  Index,
} from 'typeorm';
import { BaseEntity } from '../interfaces/base.entity';
import { User } from '../users/user.entity';
import { Post } from '../posts/posts.entity';
import { Comment } from '../comments/comment.entity';
import { VoteType } from '../utils/enums/vote-type.enum';
import { VoteStatus } from '../utils/enums/vote-status.enum';

@Entity('votes')
@Unique('UQ_user_post_comment', ['authorId', 'postId', 'commentId'])
@Check('CHK_vote_type', 'vote IN (-1, 1)')
@Check('CHK_vote_status', 'status IN (-1, 0, 1)')
@Index('IDX_vote_post', ['postId'])
@Index('IDX_vote_comment', ['commentId'])
@Index('IDX_vote_author', ['authorId'])
export class Vote extends BaseEntity {
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
  @JoinColumn({ name: 'commentId' })
  comment: Comment | null;

  @Column({ nullable: true, default: null })
  commentId: number | null;

  @Column({ type: 'tinyint' })
  vote: VoteType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'tinyint', default: VoteStatus.ACTIVE })
  status: VoteStatus;
}
