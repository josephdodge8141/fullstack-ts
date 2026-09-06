import { useEffect, useState } from 'react';

import type { HealthResponse } from '@app/schemas';
import type { AuthSession } from '@app/schemas';

import { fetchAuthSession, logout } from '../services/auth.js';
import { fetchHealth } from '../services/health.js';

export type HealthClient = (options?: { readonly signal?: AbortSignal }) => Promise<HealthResponse>;

export interface HomePageProps {
  readonly healthClient?: HealthClient;
  readonly authClient?: AuthClient;
  readonly logoutClient?: LogoutClient;
}

export type AuthClient = (options?: { readonly signal?: AbortSignal }) => Promise<AuthSession>;
export type LogoutClient = (options?: { readonly signal?: AbortSignal }) => Promise<void>;

type HealthState =
  | { readonly status: 'checking' }
  | { readonly status: 'ok'; readonly response: HealthResponse }
  | { readonly status: 'error' };

type AuthState =
  | { readonly status: 'checking' }
  | { readonly status: 'ready'; readonly session: AuthSession }
  | { readonly status: 'error' };

export function HomePage({
  healthClient = fetchHealth,
  authClient = fetchAuthSession,
  logoutClient = logout,
}: HomePageProps): React.JSX.Element {
  const [health, setHealth] = useState<HealthState>({ status: 'checking' });
  const [auth, setAuth] = useState<AuthState>({ status: 'checking' });
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setHealth({ status: 'checking' });

    void healthClient({ signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) {
          setHealth({ status: 'ok', response });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHealth({ status: 'error' });
        }
      });

    return () => controller.abort();
  }, [healthClient]);

  useEffect(() => {
    const controller = new AbortController();
    void authClient({ signal: controller.signal })
      .then((session) => {
        if (!controller.signal.aborted) setAuth({ status: 'ready', session });
      })
      .catch(() => {
        if (!controller.signal.aborted) setAuth({ status: 'error' });
      });
    return () => controller.abort();
  }, [authClient]);

  const signOut = (): void => {
    setLoggingOut(true);
    void logoutClient()
      .then(() => setAuth({ status: 'ready', session: { authenticated: false, principal: null } }))
      .catch(() => setAuth({ status: 'error' }))
      .finally(() => setLoggingOut(false));
  };

  const healthLabel =
    health.status === 'checking'
      ? 'API status: checking'
      : health.status === 'ok'
        ? `API status: ${health.response.status}`
        : 'API status: unavailable';

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="welcome-heading">
        <p className="eyebrow">A calm place to begin</p>
        <h1 id="welcome-heading">Hello World</h1>
        <p className="intro">
          Your new workspace is ready. Start with the public preview, then create an account
          whenever you are ready to continue.
        </p>
        {auth.status === 'ready' && auth.session.authenticated ? (
          <section className="account-actions" aria-label="Account actions">
            <p className="session-label">Signed in as {auth.session.principal.email}</p>
            <button
              className="button button-secondary"
              type="button"
              onClick={signOut}
              disabled={loggingOut}
            >
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </section>
        ) : (
          <nav className="account-actions" aria-label="Account actions">
            <a className="button button-primary" href="/api/v1/auth/signup">
              Create account
            </a>
            <a className="button button-secondary" href="/api/v1/auth/login">
              Log in
            </a>
          </nav>
        )}
        <p className="health-status" role="status" aria-live="polite">
          {healthLabel}
        </p>
      </section>
    </main>
  );
}
