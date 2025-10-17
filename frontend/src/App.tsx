import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Import contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import pages
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import FinishSignUp from './pages/FinishSignUp';
import Home from './pages/Home';
import Users from './pages/Users';
import ManageRegistrationRequests from './pages/ManageRegistrationRequests';
import PasswordExpiry from './pages/PasswordExpiry';
import Journalize from './pages/Journalize';
import ChartOfAccounts from './pages/ChartOfAccounts';
import EventLogs from './pages/EventLogs';
import TrialBalance from './pages/TrialBalance';
import IncomeStatement from './pages/IncomeStatement';
import RetainedEarnings from './pages/RetainedEarnings';
import BalanceSheet from './pages/BalanceSheet';

// Import logo
import finkenLogo from './assets/finken2.0logoTransparent.png';

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
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #001f3f 0%, #003366 25%, #004080 50%, #0066cc 75%, #1a8cff 100%)',
        }}
      >
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          <Box
            component="img"
            src={finkenLogo}
            alt="FinKen Logo"
            sx={{
              height: { xs: 100, sm: 120, md: 150 },
              width: 'auto',
              mb: 3,
              filter: 'brightness(0) invert(1) drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.6 },
              },
            }}
          />
          <Typography 
            variant="h4" 
            gutterBottom
            sx={{ 
              fontFamily: '"Sansation", system-ui, sans-serif',
              fontWeight: 'bold',
            }}
          >
            FinKen 2.0
          </Typography>
          <Typography variant="body1">
            Loading...
          </Typography>
        </Box>
      </Box>
    );
  }
  
  return isAuthenticated && user ? (
    <>{children}</>
  ) : (
    <Navigate to="/sign-in" replace />
  );
};

// Public Route Component (redirect to home if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #001f3f 0%, #003366 25%, #004080 50%, #0066cc 75%, #1a8cff 100%)',
        }}
      >
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          <Box
            component="img"
            src={finkenLogo}
            alt="FinKen Logo"
            sx={{
              height: { xs: 100, sm: 120, md: 150 },
              width: 'auto',
              mb: 3,
              filter: 'brightness(0) invert(1) drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.6 },
              },
            }}
          />
          <Typography 
            variant="h4" 
            gutterBottom
            sx={{ 
              fontFamily: '"Sansation", system-ui, sans-serif',
              fontWeight: 'bold',
            }}
          >
            FinKen 2.0
          </Typography>
          <Typography variant="body1">
            Loading...
          </Typography>
        </Box>
      </Box>
    );
  }
  
  return !isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/home" replace />
  );
};

// App Routes Component
const AppRoutes: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/sign-in"
        element={
          <PublicRoute>
            <SignIn />
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
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPassword />
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

      {/* Accounting routes */}
      <Route
        path="/journalize"
        element={
          <ProtectedRoute>
            {user && <Journalize user={user} onLogout={logout} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/chart-of-accounts"
        element={
          <ProtectedRoute>
            {user && <ChartOfAccounts user={user} onLogout={logout} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/event-logs"
        element={
          <ProtectedRoute>
            {user && <EventLogs user={user} onLogout={logout} />}
          </ProtectedRoute>
        }
      />

      {/* Report routes */}
      <Route
        path="/trial-balance"
        element={
          <ProtectedRoute>
            {user && <TrialBalance user={user} onLogout={logout} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/income-statement"
        element={
          <ProtectedRoute>
            {user && <IncomeStatement user={user} onLogout={logout} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/retained-earnings"
        element={
          <ProtectedRoute>
            {user && <RetainedEarnings user={user} onLogout={logout} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/balance-sheet"
        element={
          <ProtectedRoute>
            {user && <BalanceSheet user={user} onLogout={logout} />}
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
