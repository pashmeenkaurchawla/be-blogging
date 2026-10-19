import { Post } from '../../sqlSchema/posts/posts.entity';

const STATUS_LABELS: Record<number, string> = {
  1: 'ACTIVE',
  0: 'ARCHIVED',
  [-1]: 'DELETED',
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
