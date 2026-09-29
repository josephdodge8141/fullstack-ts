import type { RequestHandler } from 'express';

export function allowExpoWebOrigin(allowedOrigin: string | undefined): RequestHandler {
  return (request, response, next): void => {
    if (allowedOrigin === undefined || request.headers.origin !== allowedOrigin) {
      next();
      return;
    }
    response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
    if (request.method === 'OPTIONS') {
      response.sendStatus(204);
      return;
    }
    next();
  };
}
