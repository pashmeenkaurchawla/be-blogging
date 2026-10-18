import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseResourceService } from '../base-resource-service';
import { Post } from './posts.entity';

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
}
