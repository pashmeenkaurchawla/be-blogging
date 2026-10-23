export interface BrokerMessage<T = unknown> {
  id: string;
  queue: string;
  payload: T;
  timestamp: number;
  attempt: number;
  correlationId?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface SubscribeOptions {
  concurrency?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  deadLetterQueue?: string;
}

export interface PublishOptions {
  correlationId?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  delayMs?: number;
}

export type MessageHandler<T = unknown> = (
  message: BrokerMessage<T>,
) => Promise<void>;

export interface IMessageBroker {
  publish<T = unknown>(
    queue: string,
    payload: T,
    options?: PublishOptions,
  ): Promise<string>;

  subscribe<T = unknown>(
    queue: string,
    handler: MessageHandler<T>,
    options?: SubscribeOptions,
  ): Promise<void>;

  unsubscribe(queue: string): Promise<void>;

  onceReply<T = unknown>(
    queue: string,
    correlationId: string,
    timeoutMs?: number,
  ): Promise<BrokerMessage<T>>;

  getDeadLetterMessages(queue: string): Promise<BrokerMessage[]>;

  shutdown(): Promise<void>;
}

export type BrokerType = 'memory' | 'redis';

export interface QueueConfig {
  name: string;
  subscribeOptions?: SubscribeOptions;
}

export interface BrokerModuleOptions {
  type: BrokerType;
  defaults?: SubscribeOptions;
  redis?: {
    keyPrefix?: string;
  };
}

export const MESSAGE_BROKER = Symbol('MESSAGE_BROKER');
export const BROKER_MODULE_OPTIONS = Symbol('BROKER_MODULE_OPTIONS');
export const BROKER_QUEUE_CONFIGS = Symbol('BROKER_QUEUE_CONFIGS');
