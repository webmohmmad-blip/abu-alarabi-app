import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Wire up the JWT token from localStorage so every API request includes
// Authorization: Bearer <token>
setAuthTokenGetter(() => localStorage.getItem("token"));

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
