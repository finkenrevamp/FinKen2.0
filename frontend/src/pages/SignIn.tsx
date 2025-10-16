import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
} from '@mui/icons-material';
import type { LoginCredentials } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import AuthHeader from '../components/AuthHeader';

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, isLoading, error } = useAuth();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (localError) setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Basic validation
    if (!credentials.username || !credentials.password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    // Basic email validation (since backend expects email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.username)) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    try {
      await signIn(credentials);
      // On success, navigate to home
      navigate('/home');
    } catch (err) {
      // Error is already handled by the auth context
      // We just need to handle any additional local error logic if needed
      console.error('Sign-in error:', err);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Display either local error or context error
  const displayError = localError || error;

  return (
    <>
      <AuthHeader />
      <Box
        sx={{
          minHeight: '100vh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #001f3f 0%, #003366 25%, #004080 50%, #0066cc 75%, #1a8cff 100%)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 80%, rgba(0, 150, 255, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(0, 100, 200, 0.4) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(0, 200, 255, 0.2) 0%, transparent 50%)
            `,
            animation: 'underwater 8s ease-in-out infinite alternate',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 60% 30%, rgba(100, 200, 255, 0.2) 0%, transparent 60%),
              radial-gradient(circle at 30% 70%, rgba(0, 180, 255, 0.3) 0%, transparent 40%)
            `,
            animation: 'underwater-reverse 10s ease-in-out infinite alternate',
          },
          '@keyframes underwater': {
            '0%': {
              opacity: 0.6,
            },
            '50%': {
              opacity: 0.9,
            },
            '100%': {
              opacity: 0.7,
            },
          },
          '@keyframes underwater-reverse': {
            '0%': {
              opacity: 0.8,
            },
            '50%': {
              opacity: 0.4,
            },
            '100%': {
              opacity: 0.9,
            },
          },
        }}
      >
        <Container component="main" maxWidth="sm" sx={{ 
          position: 'relative', 
          zIndex: 10, // Higher z-index to appear above header
          height: '100vh',
          overflow: 'hidden', // Changed from 'auto' to 'hidden' to prevent scroll
          display: 'flex',
          alignItems: 'center',
          py: 2, // Reduced padding
          pt: { xs: 18, sm: 20, md: 24 }, // Reduced top padding to prevent scroll
        }}>
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
          {/* Logo and Title */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            {/* Logo is now in the AuthHeader component */}
          </Box>

          <Paper 
            elevation={8} 
            sx={{ 
              padding: 4, 
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Typography component="h2" variant="h4" align="center" gutterBottom>
              Sign In
            </Typography>

            {displayError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {displayError}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Email Address"
                name="username"
                type="email"
                autoComplete="email"
                autoFocus
                value={credentials.username}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
                helperText="Enter your email address to sign in"
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={credentials.password}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={togglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  component={Link}
                  to="/forgot-password"
                  variant="outlined"
                  fullWidth
                  sx={{ py: 1 }}
                  disabled={isLoading}
                >
                  Forgot Password?
                </Button>

                <Button
                  component={Link}
                  to="/sign-up"
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  sx={{ py: 1 }}
                  disabled={isLoading}
                >
                  Create New User
                </Button>
              </Box>
            </Box>
          </Paper>

          <Typography 
            variant="body2" 
            align="center" 
            sx={{ 
              mt: 3,
              color: 'rgba(255, 255, 255, 0.8)',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            &copy; 2025 FinKen 2.0. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
    </>
  );
};

export default SignIn;