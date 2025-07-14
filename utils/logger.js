const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

const logger = pino(
  isProd
    ? { level: 'info' } // production config
    : {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
);

module.exports = logger;
