import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for offline-ready performance
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Only register in production URLs
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.hostname.startsWith('192.168.');
                    
    if (!isLocal) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('BIN Usman Service Worker registered successfully!', reg.scope);
        })
        .catch(err => {
          console.error('Service Worker registration failed:', err);
        });
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

