'use dom';

import { useEffect, useState } from 'react';

import type { HealthResponse } from '@app/schemas';

import { App } from '../frontend/App';
import {
  applyDesignSystemPreference,
  readDesignSystemPreference,
} from '../frontend/design-system/themes/theme';
import '../frontend/styles.css';

interface WebAppProps {
  readonly requestHealth: () => Promise<HealthResponse>;
  readonly dom?: import('expo/dom').DOMProps;
}

export default function WebApp({ requestHealth }: WebAppProps): React.JSX.Element {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    applyDesignSystemPreference(
      document.documentElement,
      readDesignSystemPreference(window.localStorage),
    );

    const onPopState = (): void => setPathname(window.location.pathname);
    const onClick = (event: MouseEvent): void => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target !== '') return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/')) return;
      event.preventDefault();
      window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
      setPathname(url.pathname);
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return <App pathname={pathname} healthClient={requestHealth} />;
}
