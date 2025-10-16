import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  ArrowBack,
  Person,
  Email,
  Home,
  CalendarToday,
} from '@mui/icons-material';
import type { SignUpRequest } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import AuthHeader from '../components/AuthHeader';

const SignUp: React.FC = () => {
  const { createRegistrationRequest } = useAuth();
  const [formData, setFormData] = useState<SignUpRequest>({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    address: '',
  });
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear messages when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleDateChange = (date: Date | null) => {
    setDateOfBirth(date);
    if (date) {
      setFormData(prev => ({
        ...prev,
        dateOfBirth: date.toISOString().split('T')[0],
      }));
    }
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      setError('First name is required.');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required.');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!dateOfBirth) {
      setError('Date of birth is required.');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Address is required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const message = await createRegistrationRequest(formData);
      setSuccess(message);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        dateOfBirth: '',
        address: '',
      });
      setDateOfBirth(null);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during registration. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
        <Container component="main" maxWidth="md" sx={{ 
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
            {/* Logo and Title section removed - now in AuthHeader */}

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
                Create New User
              </Typography>
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Please provide your personal information to request access to the system. 
              An administrator will review your request and send you login credentials if approved.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Name Fields Row */}
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <TextField
                    required
                    fullWidth
                    id="firstName"
                    label="First Name"
                    name="firstName"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    InputProps={{
                      startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                  />
                  <TextField
                    required
                    fullWidth
                    id="lastName"
                    label="Last Name"
                    name="lastName"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    InputProps={{
                      startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                  />
                </Box>

                {/* Email Field */}
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />

                {/* Date of Birth Field */}
                <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                  <DatePicker
                    label="Date of Birth"
                    value={dateOfBirth}
                    onChange={handleDateChange}
                    maxDate={new Date()}
                    slotProps={{
                      textField: {
                        required: true,
                        fullWidth: true,
                        InputProps: {
                          startAdornment: <CalendarToday sx={{ mr: 1, color: 'action.active' }} />,
                        },
                      },
                    }}
                  />
                </Box>

                {/* Address Field */}
                <TextField
                  required
                  fullWidth
                  id="address"
                  label="Address"
                  name="address"
                  autoComplete="street-address"
                  multiline
                  rows={3}
                  value={formData.address}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <Home sx={{ mr: 1, color: 'action.active', alignSelf: 'flex-start', mt: 1 }} />,
                  }}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={isLoading}
              >
                {isLoading ? 'Submitting Request...' : 'Submit Registration Request'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link to="/sign-in" style={{ textDecoration: 'none' }}>
                    <Button variant="text" size="small">
                      Sign In
                    </Button>
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
          </Box>
        </Container>
      </Box>
    </LocalizationProvider>
  );
};

export default SignUp;