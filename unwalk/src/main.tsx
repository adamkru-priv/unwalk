import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// ✅ REMOVED: Don't initialize push notifications on app startup
// Push notifications will be requested when user clicks "Enable Notifications" in ProfileScreen

createRoot(document.getElementById('root')!).render(
  <App />
)
