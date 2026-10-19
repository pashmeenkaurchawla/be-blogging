import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SqlSchemaModule } from '../../sqlSchema/sql-schema.module';
import { CleanupService } from './cleanup.service';

@Module({
  imports: [ScheduleModule.forRoot(), SqlSchemaModule],
  providers: [CleanupService],
})
export class TasksModule {}
