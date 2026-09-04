import { useEffect, useState } from 'react';

import type { HealthResponse } from '@app/schemas';

import { fetchHealth } from '../services/health.js';

export type HealthClient = (options?: { readonly signal?: AbortSignal }) => Promise<HealthResponse>;

export interface HomePageProps {
  readonly healthClient?: HealthClient;
}

type HealthState =
  | { readonly status: 'checking' }
  | { readonly status: 'ok'; readonly response: HealthResponse }
  | { readonly status: 'error' };

export function HomePage({ healthClient = fetchHealth }: HomePageProps): React.JSX.Element {
  const [health, setHealth] = useState<HealthState>({ status: 'checking' });

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
        <nav className="account-actions" aria-label="Account actions">
          <a className="button button-primary" href="/api/v1/auth/signup">
            Create account
          </a>
          <a className="button button-secondary" href="/api/v1/auth/login">
            Log in
          </a>
        </nav>
        <p className="health-status" role="status" aria-live="polite">
          {healthLabel}
        </p>
      </section>
    </main>
  );
}
