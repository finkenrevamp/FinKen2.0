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
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  Email,
  Person,
  Visibility,
  VisibilityOff,
  Lock,
} from '@mui/icons-material';
import type { ForgotPasswordRequest } from '../types/auth';
import AuthHeader from '../components/AuthHeader';

interface SecurityQuestion {
  id: string;
  question: string;
  answer: string;
}

const ForgotPassword: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [emailData, setEmailData] = useState<ForgotPasswordRequest>({
    email: '',
    userId: '',
  });
  const [securityQuestions, setSecurityQuestions] = useState<SecurityQuestion[]>([
    { id: '1', question: 'What was your first pet\'s name?', answer: '' },
    { id: '2', question: 'In what city were you born?', answer: '' },
  ]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const steps = ['Verify Identity', 'Security Questions', 'Reset Password'];

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!emailData.email || !emailData.userId) {
      setError('Please enter both email address and user ID.');
      setIsLoading(false);
      return;
    }

    try {
      // TODO: Implement actual API call to verify user
      console.log('Password reset request:', emailData);
      
      // Mock verification
      setActiveStep(1);
    } catch (err) {
      setError('User not found. Please check your email and user ID.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validate security questions
    for (const question of securityQuestions) {
      if (!question.answer.trim()) {
        setError('Please answer all security questions.');
        setIsLoading(false);
        return;
      }
    }

    try {
      // TODO: Implement actual API call to verify security questions
      console.log('Security answers:', securityQuestions);
      
      // Mock verification
      setActiveStep(2);
    } catch (err) {
      setError('Incorrect answers to security questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      // TODO: Implement actual API call to reset password
      console.log('Password reset for user:', emailData.userId);
      
      setSuccess('Password has been reset successfully! You can now sign in with your new password.');
    } catch (err) {
      setError('An error occurred while resetting your password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityAnswerChange = (questionId: string, answer: string) => {
    setSecurityQuestions(prev =>
      prev.map(q => (q.id === questionId ? { ...q, answer } : q))
    );
    if (error) setError(null);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box component="form" onSubmit={handleEmailSubmit}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Please enter your email address and user ID to begin the password reset process.
            </Typography>

            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              type="email"
              value={emailData.email}
              onChange={(e) => setEmailData(prev => ({ ...prev, email: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="userId"
              label="User ID"
              name="userId"
              value={emailData.userId}
              onChange={(e) => setEmailData(prev => ({ ...prev, userId: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Continue'}
            </Button>
          </Box>
        );

      case 1:
        return (
          <Box component="form" onSubmit={handleSecurityQuestionsSubmit}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Please answer the following security questions to verify your identity.
            </Typography>

            {securityQuestions.map((question, index) => (
              <TextField
                key={question.id}
                margin="normal"
                required
                fullWidth
                label={`${index + 1}. ${question.question}`}
                value={question.answer}
                onChange={(e) => handleSecurityAnswerChange(question.id, e.target.value)}
              />
            ))}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify Answers'}
            </Button>
          </Box>
        );

      case 2:
        return (
          <Box component="form" onSubmit={handlePasswordReset}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Create a new password for your account. Make sure it meets all the requirements below.
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Password requirements:
              <br />• Minimum 8 characters
              <br />• Must start with a letter
              <br />• Must contain at least one letter, one number, and one special character
            </Typography>

            <TextField
              margin="normal"
              required
              fullWidth
              name="newPassword"
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
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
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

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
              Reset Password
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
              <Box sx={{ mt: 2 }}>
                <Button
                  component={Link}
                  to="/sign-in"
                  variant="contained"
                  size="small"
                >
                  Go to Sign In
                </Button>
              </Box>
            </Alert>
          )}

          {!success && renderStepContent()}
        </Paper>
        </Box>
      </Container>
    </Box>
    </>
  );
};

export default ForgotPassword;