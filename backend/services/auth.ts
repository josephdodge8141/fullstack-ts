import type { AuthConnection, AuthorizationMode } from '../config/oidc.js';
import type { AuthCallbackState, AuthPrincipal } from '../models/auth.js';

export interface AuthService {
  begin(mode: AuthorizationMode): ReturnType<AuthConnection['begin']>;
  complete(callbackUrl: string, transaction: AuthCallbackState): Promise<AuthPrincipal>;
}

export function createAuthService(connection: AuthConnection): AuthService {
  return {
    begin: (mode) => connection.begin(mode),
    complete: (callbackUrl, transaction) => connection.complete(callbackUrl, transaction),
  };
}
