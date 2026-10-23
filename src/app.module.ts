import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from 'src/config/config.module';
import { LoggerModule } from 'src/core/logger/logger.module';
import { SqlModule } from 'src/core/database/sql/sql.module';
import { RedisModule } from 'src/core/database/redis/redis.module';
import { SqlSchemaModule } from 'src/sqlSchema/sql-schema.module';
import { AuthModule } from 'src/core/auth/auth.module';
import { AppThrottlerModule } from 'src/core/throttler/throttler.module';
import { MessageBrokerModule } from 'src/core/message-broker/message-broker.module';
import { UsersFeatureModule } from 'src/modules/users/users.module';
import { PostsApiModule } from 'src/modules/posts/posts.module';
import { CommentsApiModule } from 'src/modules/comments/comments.module';
import { VotesApiModule } from 'src/modules/votes/votes.module';
import { TasksModule } from 'src/core/tasks/tasks.module';
import { RequestTraceMiddleware } from 'src/core/middleware/request-trace.middleware';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    SqlModule,
    SqlSchemaModule,
    AuthModule,
    AppThrottlerModule,
    MessageBrokerModule.forRoot({
      type: process.env.BROKER_TYPE === 'redis' ? 'redis' : 'memory',
      defaults: {
        concurrency: 5,
        maxRetries: 3,
        retryDelayMs: 1000,
      },
      redis: {
        keyPrefix: 'be-blog:broker',
      },
    }),
    UsersFeatureModule,
    PostsApiModule,
    CommentsApiModule,
    VotesApiModule,
    TasksModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestTraceMiddleware).forRoutes('*');
  }
}
