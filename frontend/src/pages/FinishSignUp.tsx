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
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  CheckCircle,
} from '@mui/icons-material';
import type { FinishSignUpData } from '../types/auth';
import AuthHeader from '../components/AuthHeader';

const FinishSignUp: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<FinishSignUpData>({
    username: '',
    password: '',
    confirmPassword: '',
    token: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    // Get token from URL parameters
    const token = searchParams.get('token');
    if (token) {
      setFormData(prev => ({ ...prev, token }));
      // TODO: Implement API call to verify token and get user info
      // Mock user info for now
      setUserInfo({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      });
    } else {
      setError('Invalid or missing token. Please check your email link.');
    }
  }, [searchParams]);

  const generateUsername = (firstName: string, lastName: string): string => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    return `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}${month}${year}`;
  };

  useEffect(() => {
    if (userInfo) {
      const generatedUsername = generateUsername(userInfo.firstName, userInfo.lastName);
      setFormData(prev => ({ ...prev, username: generatedUsername }));
    }
  }, [userInfo]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (!/^[a-zA-Z]/.test(password)) {
      return 'Password must start with a letter.';
    }
    if (!/[a-zA-Z]/.test(password)) {
      return 'Password must contain at least one letter.';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number.';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character.';
    }
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validate password
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      // TODO: Implement actual API call to complete registration
      console.log('Completing registration:', formData);
      
      // Mock successful registration
      setSuccess('Account setup completed successfully! You can now sign in with your credentials.');
      
      // Redirect to sign in after a delay
      setTimeout(() => {
        navigate('/sign-in');
      }, 3000);
      
    } catch (err) {
      setError('An error occurred while setting up your account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!formData.token) {
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Container component="main" maxWidth="sm" sx={{ 
            position: 'relative', 
            zIndex: 10, // Higher z-index to appear above header
            pt: { xs: 18, sm: 20, md: 24 }, // Reduced top padding to prevent scroll
          }}>
            <Paper 
              elevation={8} 
              sx={{ 
                padding: 4, 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <Alert severity="error">
                Invalid or missing token. Please check your email link or contact an administrator.
              </Alert>
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button component={Link} to="/sign-in" variant="contained">
                  Go to Sign In
                </Button>
              </Box>
            </Paper>
          </Container>
        </Box>
      </>
    );
  }

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
            Complete Account Setup
          </Typography>

          {userInfo && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Welcome, {userInfo.firstName} {userInfo.lastName}!<br />
                Your registration has been approved. Please set up your login credentials below.
              </Typography>
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
              {success}
              <Typography variant="body2" sx={{ mt: 1 }}>
                Redirecting to sign in page...
              </Typography>
            </Alert>
          )}

          {!success && (
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                value={formData.username}
                onChange={handleInputChange}
                disabled
                helperText="Username is automatically generated based on your name and registration date"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="new-password"
                value={formData.password}
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
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
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
                        aria-label="toggle confirm password visibility"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
                Password requirements:
                <br />• Minimum 8 characters
                <br />• Must start with a letter
                <br />• Must contain at least one letter, one number, and one special character
              </Typography>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={isLoading}
              >
                {isLoading ? 'Setting up Account...' : 'Complete Setup'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Need help?{' '}
                  <Link to="/sign-in" style={{ textDecoration: 'none' }}>
                    <Button variant="text" size="small">
                      Contact Support
                    </Button>
                  </Link>
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  </Box>
  </>
);
};

export default FinishSignUp;