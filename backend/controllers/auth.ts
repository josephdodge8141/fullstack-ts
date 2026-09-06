import type { RequestHandler } from 'express';

import { OidcCallbackError, type AuthorizationMode } from '../config/oidc.js';
import { authSessionSchema } from '../models/auth.js';
import {
  destroySession,
  establishSession,
  sessionFor,
  setAuthenticationTransaction,
  takeAuthenticationTransaction,
} from '../middleware/session.js';
import { HttpError } from '../middleware/errors.js';
import type { AuthService } from '../services/auth.js';

export function createAuthStartController(
  service: AuthService,
  mode: AuthorizationMode,
): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const authorization = await service.begin(mode);
      setAuthenticationTransaction(request, authorization.transaction);
      response.redirect(302, authorization.redirectUrl);
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function createAuthCallbackController(
  service: AuthService,
  publicOrigin: string,
): RequestHandler {
  return async (request, response, next): Promise<void> => {
    const transaction = takeAuthenticationTransaction(request);
    if (transaction === undefined) {
      next(new HttpError(400, 'AUTH_CALLBACK_REJECTED', 'Authentication callback was rejected'));
      return;
    }
    try {
      const callbackUrl = new URL(request.originalUrl, publicOrigin).href;
      const principal = await service.complete(callbackUrl, transaction);
      await establishSession(request, principal);
      response.redirect(302, '/');
    } catch (error: unknown) {
      if (error instanceof OidcCallbackError) {
        next(new HttpError(400, 'AUTH_CALLBACK_REJECTED', 'Authentication callback was rejected'));
        return;
      }
      next(error);
    }
  };
}

export function createAuthSessionController(): RequestHandler {
  return (request, response): void => {
    response.status(200).json(authSessionSchema.parse(sessionFor(request)));
  };
}

export function createAuthLogoutController(): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      await destroySession(request);
      response.status(204).end();
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function createProtectedSessionController(): RequestHandler {
  return (request, response): void => {
    response.status(200).json(authSessionSchema.parse(sessionFor(request)));
  };
}
