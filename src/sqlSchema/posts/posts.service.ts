import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async hardDeleteRemoved(beforeDate: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(Post)
      .where('status = :status', { status: PostStatus.REMOVED })
      .andWhere('updatedAt < :beforeDate', { beforeDate })
      .execute();
    return result.affected || 0;
  }
}
