import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  logLevel: process.env.LOG_LEVEL || 'info',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY || '30m',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
}));

export const sqlConfig = registerAs('sql', () => ({
  host: process.env.SQL_HOST || 'localhost',
  port: parseInt(process.env.SQL_PORT, 10) || 3306,
  username: process.env.SQL_USERNAME || 'root',
  password: process.env.SQL_PASSWORD || '',
  database: process.env.SQL_DATABASE || 'blogging',
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || '',
}));
