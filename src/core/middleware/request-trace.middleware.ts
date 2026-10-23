import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { LoggerService } from 'src/core/logger/logger.service';

@Injectable()
export class RequestTraceMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    const start = Date.now();
    const method = req.method;
    const url = req.url;
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'] || '-';

    this.logger.log(
      `→ ${method} ${url} | IP: ${ip} | UA: ${userAgent}`,
      'RequestTrace',
    );

    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      this.logger.log(
        `← ${method} ${url} | ${status} | ${duration}ms`,
        'RequestTrace',
      );
    });

    next();
  }
}
