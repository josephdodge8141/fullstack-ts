import session from 'express-session';
import type { Request, RequestHandler } from 'express';

import {
  authSessionSchema,
  type AuthCallbackState,
  type AuthPrincipal,
  type AuthSession,
} from '../models/auth.js';
import { HttpError } from './errors.js';

declare module 'express-session' {
  interface SessionData {
    authTransaction?: AuthCallbackState;
    principal?: AuthPrincipal;
  }
}

export function createSessionMiddleware(secret: string): RequestHandler {
  return session({
    name: 'local_auth_session',
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    },
  });
}

export function sessionFor(request: Request): AuthSession {
  const principal = request.session.principal;
  return authSessionSchema.parse(
    principal === undefined
      ? { authenticated: false, principal: null }
      : { authenticated: true, principal },
  );
}

export function setAuthenticationTransaction(
  request: Request,
  transaction: AuthCallbackState,
): void {
  request.session.authTransaction = transaction;
}

export function takeAuthenticationTransaction(request: Request): AuthCallbackState | undefined {
  const transaction = request.session.authTransaction;
  delete request.session.authTransaction;
  return transaction;
}

export async function establishSession(request: Request, principal: AuthPrincipal): Promise<void> {
  await regenerate(request);
  request.session.principal = principal;
}

export async function destroySession(request: Request): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    request.session.destroy((error) => (error === undefined ? resolve() : reject(error)));
  });
}

export const requireAuthenticated: RequestHandler = (request, _response, next): void => {
  if (request.session.principal === undefined) {
    next(new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required'));
    return;
  }
  next();
};

function regenerate(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => (error === undefined ? resolve() : reject(error)));
  });
}
