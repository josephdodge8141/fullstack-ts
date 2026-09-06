import {
  None,
  allowInsecureRequests,
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  discovery,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
  type Configuration,
} from 'openid-client';

import {
  authCallbackStateSchema,
  authPrincipalSchema,
  type AuthCallbackState,
  type AuthPrincipal,
} from '../models/auth.js';

export type AuthorizationMode = 'login' | 'signup';

export interface AuthConnection {
  begin(mode: AuthorizationMode): Promise<{
    readonly redirectUrl: string;
    readonly transaction: AuthCallbackState;
  }>;
  complete(callbackUrl: string, transaction: AuthCallbackState): Promise<AuthPrincipal>;
}

export interface OidcConnectionOptions {
  readonly issuer: string;
  readonly clientId: string;
  readonly redirectUri: string;
}

export class OidcCallbackError extends Error {
  constructor(options?: ErrorOptions) {
    super('The authentication callback could not be verified.', options);
    this.name = 'OidcCallbackError';
  }
}

export function createOidcConnection(options: OidcConnectionOptions): AuthConnection {
  let configuration: Promise<Configuration> | undefined;
  const getConfiguration = (): Promise<Configuration> => {
    if (configuration === undefined) {
      const pending = discovery(new URL(options.issuer), options.clientId, undefined, None(), {
        execute: [allowInsecureRequests],
      });
      configuration = pending;
      void pending.catch(() => {
        if (configuration === pending) configuration = undefined;
      });
    }
    return configuration;
  };

  return {
    begin: async (_mode) => {
      const codeVerifier = randomPKCECodeVerifier();
      const transaction = authCallbackStateSchema.parse({
        state: randomState(),
        nonce: randomNonce(),
        codeVerifier,
        redirectUri: options.redirectUri,
        createdAtEpochMs: Date.now(),
      });
      const redirectUrl = buildAuthorizationUrl(await getConfiguration(), {
        redirect_uri: transaction.redirectUri,
        scope: 'openid profile email',
        state: transaction.state,
        nonce: transaction.nonce,
        code_challenge: await calculatePKCECodeChallenge(transaction.codeVerifier),
        code_challenge_method: 'S256',
        prompt: 'login',
      });
      return { redirectUrl: redirectUrl.href, transaction };
    },
    complete: async (callbackUrl, transaction) => {
      if (!callbackUrl.startsWith(transaction.redirectUri)) {
        throw new OidcCallbackError();
      }
      try {
        const tokens = await authorizationCodeGrant(
          await getConfiguration(),
          new URL(callbackUrl),
          {
            expectedState: transaction.state,
            expectedNonce: transaction.nonce,
            pkceCodeVerifier: transaction.codeVerifier,
          },
        );
        const claims = tokens.claims();
        return authPrincipalSchema.parse({
          subject: claims?.sub,
          email: claims?.email,
          emailVerified: claims?.email_verified,
          displayName: claims?.name,
        });
      } catch (error: unknown) {
        throw new OidcCallbackError({ cause: error });
      }
    },
  };
}
