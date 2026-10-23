import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Version,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PostsService } from 'src/sqlSchema/posts/posts.service';
import { JwtAuthGuard } from 'src/core/auth/jwt-auth.guard';
import { CurrentUser } from 'src/core/auth/current-user.decorator';
import { CreatePostDto } from 'src/modules/posts/dto/create-post.dto';
import { UpdatePostDto } from 'src/modules/posts/dto/update-post.dto';
import { PostResponseDto } from 'src/modules/posts/dto/post-response.dto';
import { OffsetPaginationDto } from 'src/modules/posts/dto/post-pagination.dto';
import { CursorPaginationDto } from 'src/modules/posts/dto/post-pagination.dto';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: number; userName: string },
    @Body() dto: CreatePostDto,
  ) {
    const post = await this.postsService.createForUser(user.id, dto);
    return PostResponseDto.fromEntity(post);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('include') include?: string,
  ) {
    const result = await this.postsService.findActiveById(
      id,
      include === 'archived',
    );
    if ('message' in result) return result;
    return PostResponseDto.fromEntity(result);
  }

  @Get()
  async findAllOffset(
    @CurrentUser() user: { id: number; userName: string },
    @Query() query: OffsetPaginationDto,
  ) {
    const { data, meta } = await this.postsService.findPaginatedCached(
      user.id,
      query,
    );
    return { data: data.map(PostResponseDto.fromEntity), meta };
  }

  @Get()
  @Version('2')
  async findAllCursor(
    @CurrentUser() user: { id: number; userName: string },
    @Query() query: CursorPaginationDto,
  ) {
    const { data, meta } = await this.postsService.findByCursorCached(
      user.id,
      query,
    );
    return { data: data.map(PostResponseDto.fromEntity), meta };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { id: number; userName: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ) {
    const updated = await this.postsService.updateOwned(id, user.id, dto);
    return PostResponseDto.fromEntity(updated);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: { id: number; userName: string },
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.postsService.softDelete(id, user.id);
    return { message: 'Post deleted' };
  }
}
