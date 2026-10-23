import { Injectable, OnModuleDestroy, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { LoggerService } from 'src/core/logger/logger.service';
import { RedisConfigService } from 'src/config/redis-config.service';
import {
  IMessageBroker,
  BrokerMessage,
  MessageHandler,
  PublishOptions,
  SubscribeOptions,
  BrokerModuleOptions,
  BROKER_MODULE_OPTIONS,
} from 'src/core/message-broker/interfaces/message-broker.interface';

interface Subscription {
  handler: MessageHandler;
  options: Required<SubscribeOptions>;
  activeCount: number;
}

@Injectable()
export class RedisBrokerService implements IMessageBroker, OnModuleDestroy {
  private readonly context = 'RedisBroker';
  private publisher: Redis;
  private subscriber: Redis;
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly replyWaiters = new Map<
    string,
    { resolve: (msg: BrokerMessage) => void; reject: (err: Error) => void }
  >();
  private readonly defaults: Required<SubscribeOptions>;
  private readonly keyPrefix: string;
  private isShutdown = false;

  constructor(
    @Inject(BROKER_MODULE_OPTIONS) private readonly options: BrokerModuleOptions,
    private readonly redisConfig: RedisConfigService,
    private readonly logger: LoggerService,
  ) {
    this.defaults = {
      concurrency: options.defaults?.concurrency ?? 1,
      maxRetries: options.defaults?.maxRetries ?? 3,
      retryDelayMs: options.defaults?.retryDelayMs ?? 1000,
      deadLetterQueue: options.defaults?.deadLetterQueue ?? 'dlq',
    };
    this.keyPrefix = options.redis?.keyPrefix ?? 'broker';

    this.initClients();
  }

  private initClients(): void {
    const connOpts = {
      host: this.redisConfig.host,
      port: this.redisConfig.port,
      password: this.redisConfig.password || undefined,
      lazyConnect: true,
      retryStrategy: (times: number) => Math.min(times * 500, 5000),
      maxRetriesPerRequest: 1,
    };

    this.publisher = new Redis(connOpts);
    this.subscriber = new Redis(connOpts);

    for (const [label, client] of [
      ['publisher', this.publisher],
      ['subscriber', this.subscriber],
    ] as const) {
      client.on('connect', () =>
        this.logger.log(`Redis ${label} connected`, this.context),
      );
      client.on('error', (err) =>
        this.logger.error(`Redis ${label} error: ${err.message}`, err.stack, this.context),
      );
    }

    this.subscriber.on('message', (channel, raw) => {
      this.handleIncoming(channel, raw);
    });

    this.subscriber.on('pmessage', (_pattern, channel, raw) => {
      this.handleIncoming(channel, raw);
    });

    Promise.all([this.publisher.connect(), this.subscriber.connect()])
      .then(() => this.logger.log('Redis broker initialized', this.context))
      .catch((err) =>
        this.logger.warn(
          `Redis broker unavailable at startup: ${err.message}`,
          this.context,
        ),
      );
  }

  async publish<T = unknown>(
    queue: string,
    payload: T,
    options?: PublishOptions,
  ): Promise<string> {
    if (this.isShutdown) return '';

    const id = randomUUID();
    const message: BrokerMessage<T> = {
      id,
      queue,
      payload,
      timestamp: Date.now(),
      attempt: 0,
      correlationId: options?.correlationId,
      replyTo: options?.replyTo,
      headers: options?.headers,
    };

    const channel = this.channelKey(queue);
    const serialized = JSON.stringify(message);

    if (options?.delayMs) {
      setTimeout(async () => {
        await this.publisher.publish(channel, serialized).catch(() => {});
      }, options.delayMs);
    } else {
      await this.publisher.publish(channel, serialized);
    }

    return id;
  }

  async subscribe<T = unknown>(
    queue: string,
    handler: MessageHandler<T>,
    options?: SubscribeOptions,
  ): Promise<void> {
    const resolved: Required<SubscribeOptions> = {
      concurrency: options?.concurrency ?? this.defaults.concurrency,
      maxRetries: options?.maxRetries ?? this.defaults.maxRetries,
      retryDelayMs: options?.retryDelayMs ?? this.defaults.retryDelayMs,
      deadLetterQueue: options?.deadLetterQueue ?? `${queue}:${this.defaults.deadLetterQueue}`,
    };

    this.subscriptions.set(queue, {
      handler: handler as MessageHandler,
      options: resolved,
      activeCount: 0,
    });

    const channel = this.channelKey(queue);
    if (queue.includes('*')) {
      await this.subscriber.psubscribe(channel);
    } else {
      await this.subscriber.subscribe(channel);
    }

    this.logger.log(
      `Subscribed to queue "${queue}" (concurrency: ${resolved.concurrency}, retries: ${resolved.maxRetries})`,
      this.context,
    );
  }

  async unsubscribe(queue: string): Promise<void> {
    this.subscriptions.delete(queue);

    const channel = this.channelKey(queue);
    if (queue.includes('*')) {
      await this.subscriber.punsubscribe(channel);
    } else {
      await this.subscriber.unsubscribe(channel);
    }

    this.logger.log(`Unsubscribed from queue "${queue}"`, this.context);
  }

  async onceReply<T = unknown>(
    queue: string,
    correlationId: string,
    timeoutMs = 30000,
  ): Promise<BrokerMessage<T>> {
    return new Promise((resolve, reject) => {
      const replyQueue = `${queue}:reply:${correlationId}`;

      const timer = setTimeout(() => {
        this.replyWaiters.delete(correlationId);
        this.unsubscribe(replyQueue).catch(() => {});
        reject(new Error(`Reply timeout for correlationId "${correlationId}" after ${timeoutMs}ms`));
      }, timeoutMs);

      this.replyWaiters.set(correlationId, {
        resolve: (msg) => {
          clearTimeout(timer);
          this.replyWaiters.delete(correlationId);
          this.unsubscribe(replyQueue).catch(() => {});
          resolve(msg as BrokerMessage<T>);
        },
        reject: (err) => {
          clearTimeout(timer);
          this.replyWaiters.delete(correlationId);
          this.unsubscribe(replyQueue).catch(() => {});
          reject(err);
        },
      });

      this.subscribe<T>(replyQueue, async (msg) => {
        const waiter = this.replyWaiters.get(correlationId);
        if (waiter) waiter.resolve(msg as BrokerMessage);
      });
    });
  }

  async getDeadLetterMessages(queue: string): Promise<BrokerMessage[]> {
    const key = this.dlqKey(queue);
    const raw = await this.publisher.lrange(key, 0, -1).catch(() => []);
    return raw.map((r) => JSON.parse(r));
  }

  async shutdown(): Promise<void> {
    this.isShutdown = true;

    for (const [, waiter] of this.replyWaiters) {
      waiter.reject(new Error('Broker shutting down'));
    }
    this.replyWaiters.clear();
    this.subscriptions.clear();

    await this.subscriber?.quit().catch(() => {});
    await this.publisher?.quit().catch(() => {});

    this.logger.log('Redis broker shut down', this.context);
  }

  async onModuleDestroy() {
    await this.shutdown();
  }

  private handleIncoming(channel: string, raw: string): void {
    if (this.isShutdown) return;

    let message: BrokerMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      this.logger.warn(`Unparseable message on channel "${channel}"`, this.context);
      return;
    }

    const waiter = this.replyWaiters.get(message.correlationId);
    if (waiter) {
      waiter.resolve(message);
      return;
    }

    const queue = this.queueFromChannel(channel);
    const sub = this.subscriptions.get(queue);
    if (!sub) return;

    if (sub.activeCount >= sub.options.concurrency) return;

    this.process(queue, sub, message);
  }

  private async process(
    queue: string,
    sub: Subscription,
    message: BrokerMessage,
  ): Promise<void> {
    sub.activeCount++;
    message.attempt++;

    try {
      await sub.handler(message);
    } catch {
      if (message.attempt < sub.options.maxRetries) {
        setTimeout(async () => {
          const channel = this.channelKey(queue);
          await this.publisher
            .publish(channel, JSON.stringify(message))
            .catch(() => {});
        }, sub.options.retryDelayMs * message.attempt);
      } else {
        await this.sendToDeadLetter(sub.options.deadLetterQueue, message);
        this.logger.warn(
          `Message ${message.id} moved to DLQ "${sub.options.deadLetterQueue}" after ${message.attempt} attempts`,
          this.context,
        );
      }
    } finally {
      sub.activeCount--;
    }
  }

  private async sendToDeadLetter(
    dlq: string,
    message: BrokerMessage,
  ): Promise<void> {
    const key = this.dlqKey(dlq);
    await this.publisher.rpush(key, JSON.stringify(message)).catch(() => {});
  }

  private channelKey(queue: string): string {
    return `${this.keyPrefix}:ch:${queue}`;
  }

  private dlqKey(queue: string): string {
    return `${this.keyPrefix}:dlq:${queue}`;
  }

  private queueFromChannel(channel: string): string {
    const prefix = `${this.keyPrefix}:ch:`;
    return channel.startsWith(prefix) ? channel.slice(prefix.length) : channel;
  }
}
