import { HomePage, type HomePageProps } from './pages/HomePage.js';
import { fetchAuthSession, logout } from './services/auth.js';
import { fetchHealth } from './services/health.js';

export type AppProps = HomePageProps;

export function App({
  healthClient = fetchHealth,
  authClient = fetchAuthSession,
  logoutClient = logout,
}: AppProps): React.JSX.Element {
  return (
    <HomePage healthClient={healthClient} authClient={authClient} logoutClient={logoutClient} />
  );
}
