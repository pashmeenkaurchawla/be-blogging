import { Post } from 'src/sqlSchema/posts/posts.entity';
import { PostStatus } from 'src/sqlSchema/utils/enums/post-status.enum';

const STATUS_LABELS: Record<number, string> = {
  [PostStatus.ACTIVE]: 'ACTIVE',
  [PostStatus.ARCHIVED]: 'ARCHIVED',
  [PostStatus.REMOVED]: 'DELETED',
};

export class PostResponseDto {
  id: number;
  authorId: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;

  static fromEntity(post: Post): PostResponseDto {
    const dto = new PostResponseDto();
    dto.id = post.id;
    dto.authorId = post.authorId;
    dto.title = post.title;
    dto.content = post.content;
    dto.createdAt = post.createdAt;
    dto.updatedAt = post.updatedAt;
    dto.status = STATUS_LABELS[post.status] ?? 'UNKNOWN';
    return dto;
  }
}
