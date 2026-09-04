import { z } from 'zod';

export const authCallbackStateSchema = z.strictObject({
  state: z.string().min(16).max(512),
  nonce: z.string().min(16).max(512),
  codeVerifier: z.string().min(43).max(128),
  redirectUri: z.url(),
  createdAtEpochMs: z.number().int().nonnegative(),
});

export const authProviderTokenSetSchema = z.strictObject({
  accessToken: z.string().min(1),
  idToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresInSeconds: z.number().int().positive(),
  tokenType: z.literal('Bearer'),
});

export type AuthCallbackState = z.infer<typeof authCallbackStateSchema>;
export type AuthProviderTokenSet = z.infer<typeof authProviderTokenSetSchema>;
