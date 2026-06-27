import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.js';
import './design-system/styles.css';

// Apply the persisted theme before first paint (light is the cockpit default).
try {
  document.documentElement.dataset.theme =
    localStorage.getItem('rick.theme.dark') === '1' ? 'dark' : 'light';
} catch {
  document.documentElement.dataset.theme = 'light';
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
