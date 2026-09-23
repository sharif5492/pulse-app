import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

// Global resilience handler to catch unhandled promise rejections or third-party SDK errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason && typeof reason === 'object' && !(reason instanceof Error)) {
      console.warn('[Global Resilience] Intercepted async object rejection:', JSON.stringify(reason));
    } else {
      console.warn('[Global Resilience] Intercepted unhandled promise rejection:', reason);
    }
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    if (event.error) {
      console.warn('[Global Resilience] Intercepted runtime error:', event.error);
    }
  });

  // Capture PWA install prompt globally
  window.addEventListener('beforeinstallprompt', (e) => {
    (window as any).deferredPWAEvent = e;
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

