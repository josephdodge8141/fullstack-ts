import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import {
  applyDesignSystemPreference,
  readDesignSystemPreference,
} from './design-system/themes/theme.js';
import './styles.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Application root element is missing');
}

applyDesignSystemPreference(
  document.documentElement,
  readDesignSystemPreference(window.localStorage),
);

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
