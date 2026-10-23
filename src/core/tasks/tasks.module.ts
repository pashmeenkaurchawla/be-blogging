import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SqlSchemaModule } from 'src/sqlSchema/sql-schema.module';
import { CleanupService } from 'src/core/tasks/cleanup.service';

@Module({
  imports: [ScheduleModule.forRoot(), SqlSchemaModule],
  providers: [CleanupService],
})
export class TasksModule {}
