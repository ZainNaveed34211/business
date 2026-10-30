import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

const saved = localStorage.getItem('kluzar-business-theme');
if (saved === 'dark' || saved === 'light') {
  document.documentElement.setAttribute('data-theme', saved);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      const check = () => {
        if (reg.waiting) window.dispatchEvent(new Event('kluzar-sw-update'));
      };
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (sw) sw.addEventListener('statechange', check);
      });
      check();
    }).catch(() => {});
  });
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
