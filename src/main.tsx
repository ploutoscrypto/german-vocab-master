import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/globals.css';
import '@/i18n';
import App from '@/app/App';
import { autoBackup } from '@/db/backup';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Best-effort local safety-net snapshot shortly after load, and when the tab
// is hidden (e.g. app switch on mobile).
setTimeout(() => {
  void autoBackup();
}, 4000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void autoBackup();
});
