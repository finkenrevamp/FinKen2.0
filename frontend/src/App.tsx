import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Import contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import pages
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import FinishSignUp from './pages/FinishSignUp';
import Home from './pages/Home';
import Users from './pages/Users';
import ManageRegistrationRequests from './pages/ManageRegistrationRequests';
import PasswordExpiry from './pages/PasswordExpiry';

import './App.css'

// Create Material UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  return isAuthenticated && user ? (
    <>{children}</>
  ) : (
    <Navigate to="/sign-in" replace />
  );
};

// Public Route Component (redirect to home if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/home" replace />
  );
};

// App Routes Component
const AppRoutes: React.FC = () => {
  const { isAuthenticated, user, login, logout } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/sign-in"
        element={
          <PublicRoute>
            <SignIn onLogin={login} />
          </PublicRoute>
        }
      />
      <Route
        path="/sign-up"
        element={
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/finish-signup"
        element={
          <PublicRoute>
            <FinishSignUp />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            {user && <Home user={user} onLogout={logout} />}
          </ProtectedRoute>
        }
      />

      {/* Placeholder routes for future implementation */}
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            {user && <Users user={user} onLogout={logout} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/registrations"
        element={
          <ProtectedRoute>
            {user && <ManageRegistrationRequests user={user} onLogout={logout} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/expiring-passwords"
        element={
          <ProtectedRoute>
            {user && <PasswordExpiry user={user} onLogout={logout} />}
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/home" replace />
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      {/* Catch all route */}
      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? "/home" : "/sign-in"} replace />
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
