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
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Fab,
  Tooltip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  AccountCircle,
  Login,
} from '@mui/icons-material';
import Draggable from 'react-draggable';
import type { LoginCredentials } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import AuthHeader from '../components/AuthHeader';
import AnimatedBackground from '../components/AnimatedBackground';

interface UserCredential {
  email: string;
  accountType: string;
  password: string;
}

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, isLoading, error } = useAuth();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showCredentialsPopup, setShowCredentialsPopup] = useState(false);

  // Test user credentials from passwords.txt
  const testUsers: UserCredential[] = [
    {
      email: 'finken2.0admin@atomicmail.io',
      accountType: 'Admin',
      password: 'Admin123!',
    },
    {
      email: 'finken2.0manager@atomicmail.io',
      accountType: 'Manager',
      password: 'Manager123!',
    },
    {
      email: 'finken2.0accountant@atomicmail.io',
      accountType: 'Accountant',
      password: 'Accountant123!',
    },
  ];

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

  const handleFillCredentials = (user: UserCredential) => {
    setCredentials({
      username: user.email,
      password: user.password,
    });
    if (localError) setLocalError(null);
  };

  const PaperComponent = (props: any) => {
    return (
      <Draggable handle="#draggable-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
        <Paper {...props} />
      </Draggable>
    );
  };

  // Display either local error or context error
  const displayError = localError || error;

  return (
    <>
      <AuthHeader />
      <AnimatedBackground>
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
          {/* Floating button to open credentials popup */}
          <Tooltip title="View Test Credentials" placement="left">
            <Fab
              color="primary"
              aria-label="test credentials"
              onClick={() => setShowCredentialsPopup(true)}
              sx={{
                position: 'fixed',
                bottom: 32,
                right: 32,
                zIndex: 1000,
              }}
            >
              <AccountCircle />
            </Fab>
          </Tooltip>

          {/* Draggable Credentials Popup */}
          <Dialog
            open={showCredentialsPopup}
            onClose={() => setShowCredentialsPopup(false)}
            PaperComponent={PaperComponent}
            aria-labelledby="draggable-dialog-title"
            maxWidth="md"
            sx={{
              '& .MuiDialog-paper': {
                minWidth: '600px',
              },
            }}
          >
            <DialogTitle style={{ cursor: 'move' }} id="draggable-dialog-title">
              Test User Credentials
            </DialogTitle>
            <DialogContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Email</strong></TableCell>
                      <TableCell><strong>Account Type</strong></TableCell>
                      <TableCell><strong>Password</strong></TableCell>
                      <TableCell><strong>Action</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {testUsers.map((user, index) => (
                      <TableRow key={index}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.accountType}</TableCell>
                        <TableCell>{user.password}</TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Login />}
                            onClick={() => {
                              handleFillCredentials(user);
                              setShowCredentialsPopup(false);
                            }}
                          >
                            Use
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
          </Dialog>

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
      </AnimatedBackground>
    </>
  );
};

export default SignIn;