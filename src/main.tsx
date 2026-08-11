import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent scroll wheel from incrementing/decrementing numeric inputs
document.addEventListener('wheel', () => {
  if (document.activeElement && (document.activeElement as HTMLElement).tagName === 'INPUT') {
    const input = document.activeElement as HTMLInputElement;
    if (input.type === 'number') {
      input.blur();
    }
  }
}, { passive: true });

// Register Service Worker for PWA Offline capability
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('VCA Fabrics PWA ServiceWorker registered:', registration.scope);
      },
      (err) => {
        console.log('ServiceWorker registration failed:', err);
      }
    );
  });
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
