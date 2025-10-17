import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  Lock,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { authService } from '../services';
import AuthHeader from '../components/AuthHeader';
import AnimatedBackground from '../components/AnimatedBackground';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('No reset token provided');
        setIsVerifying(false);
        return;
      }

      try {
        const response = await authService.verifyResetToken(token);
        if (response.valid) {
          setTokenValid(true);
        } else {
          setError(response.error || 'Invalid or expired reset token');
        }
      } catch (err) {
        setError('Failed to verify reset token');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/^[A-Za-z]/.test(pwd)) {
      return 'Password must start with a letter';
    }
    if (!/[A-Za-z]/.test(pwd)) {
      return 'Password must contain at least one letter';
    }
    if (!/\d/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('No reset token provided');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      const message = await authService.resetPassword({
        token,
        new_password: password,
      });
      setSuccess(message);
      
      // Redirect to sign-in after 3 seconds
      setTimeout(() => {
        navigate('/sign-in');
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while resetting password. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthHeader />
      <AnimatedBackground>
        <Container component="main" maxWidth="sm" sx={{ 
          position: 'relative', 
          zIndex: 10,
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          py: 2,
          pt: { xs: 18, sm: 20, md: 24 },
        }}>
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
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
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Button
                  component={Link}
                  to="/sign-in"
                  startIcon={<ArrowBack />}
                  sx={{ mr: 2 }}
                >
                  Back to Sign In
                </Button>
                <Typography component="h2" variant="h4">
                  Reset Password
                </Typography>
              </Box>

              {isVerifying ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : !tokenValid ? (
                <Alert severity="error">
                  {error || 'Invalid or expired reset token'}
                  <Box sx={{ mt: 2 }}>
                    <Button
                      component={Link}
                      to="/forgot-password"
                      variant="contained"
                      size="small"
                    >
                      Request New Reset Link
                    </Button>
                  </Box>
                </Alert>
              ) : (
                <>
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    Please enter your new password.
                  </Typography>

                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}

                  {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      {success}
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Redirecting to sign in...
                      </Typography>
                    </Alert>
                  )}

                  {!success && (
                    <Box component="form" onSubmit={handleSubmit}>
                      <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="password"
                        label="New Password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        helperText="Must be 8+ characters, start with a letter, contain a number and special character"
                      />

                      <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="confirmPassword"
                        label="Confirm New Password"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                edge="end"
                              >
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
                        {isLoading ? 'Resetting Password...' : 'Reset Password'}
                      </Button>

                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Remember your password?{' '}
                          <Link to="/sign-in" style={{ textDecoration: 'none' }}>
                            <Button variant="text" size="small">
                              Sign In
                            </Button>
                          </Link>
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </Paper>
          </Box>
        </Container>
      </AnimatedBackground>
    </>
  );
};

export default ResetPassword;
