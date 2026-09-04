import { z } from 'zod';

const emailSchema = z.email().max(254);
const passwordSchema = z.string().min(12).max(128);

export const authPrincipalSchema = z.strictObject({
  subject: z.string().trim().min(1).max(255),
  email: emailSchema,
  emailVerified: z.boolean(),
  displayName: z.string().trim().min(1).max(200).optional(),
});

export const anonymousSessionSchema = z.strictObject({
  authenticated: z.literal(false),
  principal: z.null(),
});

export const authenticatedSessionSchema = z.strictObject({
  authenticated: z.literal(true),
  principal: authPrincipalSchema,
});

export const authSessionSchema = z.discriminatedUnion('authenticated', [
  anonymousSessionSchema,
  authenticatedSessionSchema,
]);

export const loginRequestSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const signupRequestSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});

export type AuthPrincipal = z.infer<typeof authPrincipalSchema>;
export type AnonymousSession = z.infer<typeof anonymousSessionSchema>;
export type AuthenticatedSession = z.infer<typeof authenticatedSessionSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SignupRequest = z.infer<typeof signupRequestSchema>;
