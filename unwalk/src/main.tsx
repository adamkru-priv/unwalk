import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initIosPushNotifications } from './lib/push/iosPush';

// Initialize iOS push notifications early (no-op on web/PWA)
initIosPushNotifications();

createRoot(document.getElementById('root')!).render(
  <App />
)
