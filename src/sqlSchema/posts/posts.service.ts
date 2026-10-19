import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { BaseResourceService } from '../base-resource-service';
import { Post } from './posts.entity';
import { PostStatus } from '../utils/enums/post-status.enum';

@Injectable()
export class PostsService extends BaseResourceService<Post> {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
  ) {
    super(postsRepository);
  }

  async findByAuthor(authorId: number): Promise<Post[]> {
    return this.repository.find({ where: { authorId } });
  }

  async findPaginated(options: {
    page: number;
    limit: number;
    status: number;
    authorId?: number;
  }): Promise<{ data: Post[]; total: number }> {
    const where: Record<string, unknown> = { status: options.status };
    if (options.authorId) {
      where.authorId = options.authorId;
    }
    const [data, total] = await this.repository.findAndCount({
      where,
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      order: { id: 'DESC' },
    });
    return { data, total };
  }

  async findByCursor(options: {
    cursor?: number;
    limit: number;
    status: number;
    authorId?: number;
  }): Promise<{ data: Post[]; hasMore: boolean }> {
    const where: Record<string, unknown> = { status: options.status };
    if (options.authorId) {
      where.authorId = options.authorId;
    }
    if (options.cursor) {
      where.id = LessThan(options.cursor);
    }
    const results = await this.repository.find({
      where,
      order: { id: 'DESC' },
      take: options.limit + 1,
    });
    const hasMore = results.length > options.limit;
    if (hasMore) {
      results.pop();
    }
    return { data: results, hasMore };
  }

  async softDelete(id: number, authorId: number): Promise<void> {
    const post = await this.findById(id);
    if (!post) {
      throw new NotFoundException(`Post with id=${id} not found`);
    }
    if (post.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    post.status = PostStatus.REMOVED;
    await this.repository.save(post);
  }
}
