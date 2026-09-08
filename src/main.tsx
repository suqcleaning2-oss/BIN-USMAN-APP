import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Capacitor} from '@capacitor/core';
import App from './App.tsx';
import './index.css';

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('native-app');
  const viewport = document.querySelector('meta[name="viewport"]');
  viewport?.setAttribute(
    'content',
    'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no'
  );
}

const isAppleMobile =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// iPhone Safari service workers commonly cache a blank page. Clear them and do not re-register.
if (isAppleMobile && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

// Register Service Worker for offline-ready performance (web only, not iOS).
if ('serviceWorker' in navigator && !Capacitor.isNativePlatform() && !isAppleMobile) {
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

