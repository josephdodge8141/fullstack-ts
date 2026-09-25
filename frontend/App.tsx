import { HomePage, type HomePageProps } from './pages/HomePage.js';
import { fetchHealth } from './services/health.js';

export type AppProps = HomePageProps;

export function App({ healthClient = fetchHealth }: AppProps): React.JSX.Element {
  return <HomePage healthClient={healthClient} />;
}
