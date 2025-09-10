'use client';

import { useEffect } from 'react';

// Component to register the service worker for PWA functionality
export default function SWRegister() {
  useEffect(() => {
    // Register service worker only in the browser
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('Service Worker registered successfully:', registration);
        }).catch(error => {
          console.log('Service Worker registration failed:', error);
        });
      });
    }
  }, []);

  return null; // This component doesn't render anything
}
