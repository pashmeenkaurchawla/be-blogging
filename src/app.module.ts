import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './core/logger/logger.module';
import { SqlModule } from './core/database/sql/sql.module';
import { RedisModule } from './core/database/redis/redis.module';
import { SqlSchemaModule } from './sqlSchema/sql-schema.module';
import { AuthModule } from './core/auth/auth.module';
import { AppThrottlerModule } from './core/throttler/throttler.module';
import { UsersFeatureModule } from './users/users.module';
import { PostsApiModule } from './posts/posts.module';
import { CommentsApiModule } from './comments/comments.module';
import { VotesApiModule } from './votes/votes.module';
import { TasksModule } from './core/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    SqlModule,
    RedisModule,
    SqlSchemaModule,
    AuthModule,
    AppThrottlerModule,
    UsersFeatureModule,
    PostsApiModule,
    CommentsApiModule,
    VotesApiModule,
    TasksModule,
  ],
})
export class AppModule {}
