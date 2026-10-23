import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  BrokerModuleOptions,
  MESSAGE_BROKER,
  BROKER_MODULE_OPTIONS,
} from 'src/core/message-broker/interfaces/message-broker.interface';
import { InMemoryBrokerService } from 'src/core/message-broker/in-memory/in-memory-broker.service';
import { RedisBrokerService } from 'src/core/message-broker/redis/redis-broker.service';

@Global()
@Module({})
export class MessageBrokerModule {
  static forRoot(options: BrokerModuleOptions): DynamicModule {
    const brokerProvider = {
      provide: MESSAGE_BROKER,
      useClass:
        options.type === 'redis' ? RedisBrokerService : InMemoryBrokerService,
    };

    const optionsProvider = {
      provide: BROKER_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: MessageBrokerModule,
      providers: [optionsProvider, brokerProvider],
      exports: [MESSAGE_BROKER],
    };
  }
}
