import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { configure } from '@tasks-management/frontend-services';
import './i18n';
import './index.css';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// Configure SDK
configure({
  authBaseURL: import.meta.env.VITE_AUTH_URL || 'http://localhost:3001',
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
});

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
