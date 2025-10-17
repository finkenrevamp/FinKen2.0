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
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  ArrowBack,
  Email,
  Person,
  QuestionAnswer,
} from '@mui/icons-material';
import type { ForgotPasswordRequest, SecurityQuestionResponse } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import AuthHeader from '../components/AuthHeader';

const ForgotPassword: React.FC = () => {
  const { initiateForgotPassword, verifySecurityAnswer } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email+Username, 2: Security Question, 3: Success
  const [emailData, setEmailData] = useState<ForgotPasswordRequest>({
    email: '',
    username: '',
  });
  const [securityQuestion, setSecurityQuestion] = useState<SecurityQuestionResponse | null>(null);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!emailData.email || !emailData.username) {
      setError('Please enter both email address and username.');
      setIsLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.email)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await initiateForgotPassword(emailData);
      setSecurityQuestion(response);
      setStep(2);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred. Please check your email and username.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!securityAnswer.trim()) {
      setError('Please enter your security answer.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await verifySecurityAnswer({
        email: emailData.email,
        username: emailData.username,
        security_answer: securityAnswer,
      });
      setSuccess(response.message);
      setStep(3);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Incorrect security answer. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 2) {
      setSecurityAnswer('');
      setStep(1);
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

              <Typography variant="body1" sx={{ mb: 3 }}>
                Enter your email address and we'll send you a link to reset your password.
              </Typography>

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

              {step === 1 && (
                <Box component="form" onSubmit={handleStep1Submit}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Step 1 of 2: Enter your account information
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
                    autoFocus
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
                    id="username"
                    label="Username"
                    name="username"
                    autoComplete="username"
                    value={emailData.username}
                    onChange={(e) => setEmailData(prev => ({ ...prev, username: e.target.value }))}
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
                    sx={{ mt: 3, mb: 2, py: 1.5 }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Verifying...' : 'Continue'}
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

              {step === 2 && securityQuestion && (
                <Box component="form" onSubmit={handleStep2Submit}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Step 2 of 2: Answer your security question
                  </Typography>

                  <Box sx={{ 
                    bgcolor: '#e3f2fd', 
                    p: 2, 
                    borderRadius: 1, 
                    mb: 3,
                    border: '1px solid #90caf9'
                  }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Security Question:
                    </Typography>
                    <Typography variant="body1">
                      {securityQuestion.question_text}
                    </Typography>
                  </Box>

                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="security-answer"
                    label="Your Answer"
                    name="security-answer"
                    autoFocus
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <QuestionAnswer />
                        </InputAdornment>
                      ),
                    }}
                    helperText="Your answer is case-sensitive"
                  />

                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={handleBack}
                      sx={{ flex: 1 }}
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      sx={{ flex: 2, py: 1.5 }}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Verifying...' : 'Submit Answer'}
                    </Button>
                  </Box>
                </Box>
              )}

              {step === 3 && (
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
              )}
            </Paper>
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default ForgotPassword;