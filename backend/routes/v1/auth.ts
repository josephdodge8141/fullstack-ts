import { Router } from 'express';

import {
  createAuthCallbackController,
  createAuthLogoutController,
  createAuthSessionController,
  createAuthStartController,
  createProtectedSessionController,
} from '../../controllers/auth.js';
import { requireAuthenticated } from '../../middleware/session.js';
import type { AuthService } from '../../services/auth.js';

export function createAuthRoute(service: AuthService, publicOrigin: string): Router {
  const router = Router();
  router.get('/auth/login', createAuthStartController(service, 'login'));
  router.get('/auth/signup', createAuthStartController(service, 'signup'));
  router.get('/auth/callback', createAuthCallbackController(service, publicOrigin));
  router.get('/auth/session', createAuthSessionController());
  router.post('/auth/logout', createAuthLogoutController());
  router.get('/auth/protected', requireAuthenticated, createProtectedSessionController());
  return router;
}
