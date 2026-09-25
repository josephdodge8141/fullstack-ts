import { lazy, Suspense } from 'react';

import { HomePage, type HomePageProps } from './pages/HomePage.js';
import { ComponentCatalogPage } from './pages/ComponentCatalogPage.js';
import { fetchHealth } from './services/health.js';

export type AppProps = HomePageProps;

const ComponentSystemPage = lazy(async () => {
  const module = await import('./pages/ComponentSystemPage.js');
  return { default: module.ComponentSystemPage };
});

const DesignSystemsPage = lazy(async () => {
  const module = await import('./pages/DesignSystemsPage.js');
  return { default: module.DesignSystemsPage };
});

export function App({ healthClient = fetchHealth }: AppProps): React.JSX.Element {
  if (window.location.pathname === '/components') return <ComponentCatalogPage />;
  if (window.location.pathname === '/design-systems') {
    return (
      <Suspense fallback={<p role="status">Loading design systems</p>}>
        <DesignSystemsPage />
      </Suspense>
    );
  }
  if (window.location.pathname.startsWith('/components/')) {
    return (
      <Suspense fallback={<p role="status">Loading components</p>}>
        <ComponentSystemPage />
      </Suspense>
    );
  }
  return <HomePage healthClient={healthClient} />;
}
