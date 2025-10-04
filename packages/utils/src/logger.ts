import pino from 'pino';

export const createLogger = (name: string) => {
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.email',
        '*.ssn',
        '*.cpf',
        '*.curp',
        '*.dni',
      ],
      remove: true,
    },
  });
};
