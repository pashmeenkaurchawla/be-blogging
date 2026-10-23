import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LoggerService } from 'src/core/logger/logger.service';
import {
  IMessageBroker,
  BrokerMessage,
  MessageHandler,
  PublishOptions,
  SubscribeOptions,
  BrokerModuleOptions,
  BROKER_MODULE_OPTIONS,
} from 'src/core/message-broker/interfaces/message-broker.interface';
import { Inject } from '@nestjs/common';

interface Subscription {
  handler: MessageHandler;
  options: Required<SubscribeOptions>;
  activeCount: number;
}

@Injectable()
export class InMemoryBrokerService implements IMessageBroker, OnModuleDestroy {
  private readonly context = 'InMemoryBroker';
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly deadLetters = new Map<string, BrokerMessage[]>();
  private readonly pendingQueue = new Map<string, BrokerMessage[]>();
  private readonly replyWaiters = new Map<
    string,
    { resolve: (msg: BrokerMessage) => void; reject: (err: Error) => void }
  >();
  private readonly defaults: Required<SubscribeOptions>;
  private isShutdown = false;

  constructor(
    @Inject(BROKER_MODULE_OPTIONS) private readonly options: BrokerModuleOptions,
    private readonly logger: LoggerService,
  ) {
    this.defaults = {
      concurrency: options.defaults?.concurrency ?? 1,
      maxRetries: options.defaults?.maxRetries ?? 3,
      retryDelayMs: options.defaults?.retryDelayMs ?? 1000,
      deadLetterQueue: options.defaults?.deadLetterQueue ?? 'dlq',
    };
    this.logger.log('In-memory message broker initialized', this.context);
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

    if (options?.delayMs) {
      setTimeout(() => this.dispatch(queue, message), options.delayMs);
    } else {
      this.dispatch(queue, message);
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

    this.logger.log(
      `Subscribed to queue "${queue}" (concurrency: ${resolved.concurrency}, retries: ${resolved.maxRetries})`,
      this.context,
    );

    this.drainPending(queue);
  }

  async unsubscribe(queue: string): Promise<void> {
    this.subscriptions.delete(queue);
    this.logger.log(`Unsubscribed from queue "${queue}"`, this.context);
  }

  async onceReply<T = unknown>(
    queue: string,
    correlationId: string,
    timeoutMs = 30000,
  ): Promise<BrokerMessage<T>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.replyWaiters.delete(correlationId);
        reject(new Error(`Reply timeout for correlationId "${correlationId}" after ${timeoutMs}ms`));
      }, timeoutMs);

      this.replyWaiters.set(correlationId, {
        resolve: (msg) => {
          clearTimeout(timer);
          this.replyWaiters.delete(correlationId);
          resolve(msg as BrokerMessage<T>);
        },
        reject: (err) => {
          clearTimeout(timer);
          this.replyWaiters.delete(correlationId);
          reject(err);
        },
      });

      this.subscribe(
        `${queue}:reply:${correlationId}`,
        async (msg) => {
          const waiter = this.replyWaiters.get(correlationId);
          if (waiter) waiter.resolve(msg);
          await this.unsubscribe(`${queue}:reply:${correlationId}`);
        },
      );
    });
  }

  async getDeadLetterMessages(queue: string): Promise<BrokerMessage[]> {
    return this.deadLetters.get(queue) ?? [];
  }

  async shutdown(): Promise<void> {
    this.isShutdown = true;
    this.subscriptions.clear();
    this.pendingQueue.clear();

    for (const [, waiter] of this.replyWaiters) {
      waiter.reject(new Error('Broker shutting down'));
    }
    this.replyWaiters.clear();

    this.logger.log('In-memory broker shut down', this.context);
  }

  async onModuleDestroy() {
    await this.shutdown();
  }

  private dispatch(queue: string, message: BrokerMessage): void {
    const waiter = this.replyWaiters.get(message.correlationId);
    if (waiter) {
      waiter.resolve(message);
      return;
    }

    const sub = this.subscriptions.get(queue);
    if (!sub) {
      const pending = this.pendingQueue.get(queue) ?? [];
      pending.push(message);
      this.pendingQueue.set(queue, pending);
      return;
    }

    if (sub.activeCount >= sub.options.concurrency) {
      const pending = this.pendingQueue.get(queue) ?? [];
      pending.push(message);
      this.pendingQueue.set(queue, pending);
      return;
    }

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
    } catch (err) {
      if (message.attempt < sub.options.maxRetries) {
        setTimeout(
          () => this.dispatch(queue, message),
          sub.options.retryDelayMs * message.attempt,
        );
      } else {
        this.sendToDeadLetter(sub.options.deadLetterQueue, message);
        this.logger.warn(
          `Message ${message.id} moved to DLQ "${sub.options.deadLetterQueue}" after ${message.attempt} attempts`,
          this.context,
        );
      }
    } finally {
      sub.activeCount--;
      this.drainPending(queue);
    }
  }

  private drainPending(queue: string): void {
    const sub = this.subscriptions.get(queue);
    if (!sub) return;

    const pending = this.pendingQueue.get(queue);
    if (!pending?.length) return;

    while (sub.activeCount < sub.options.concurrency && pending.length) {
      const next = pending.shift();
      this.process(queue, sub, next);
    }

    if (!pending.length) this.pendingQueue.delete(queue);
  }

  private sendToDeadLetter(dlq: string, message: BrokerMessage): void {
    const list = this.deadLetters.get(dlq) ?? [];
    list.push(message);
    this.deadLetters.set(dlq, list);
  }
}
