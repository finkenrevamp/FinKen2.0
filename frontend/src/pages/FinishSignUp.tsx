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
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  CheckCircle,
  HelpOutline,
} from '@mui/icons-material';
import { authService, type SecurityQuestion, type VerifyInvitationResponse } from '../services/authService';
import AuthHeader from '../components/AuthHeader';
import AnimatedBackground from '../components/AnimatedBackground';

interface FormData {
  password: string;
  confirmPassword: string;
  securityQuestionId: number | '';
  securityAnswer: string;
}

const FinishSignUp: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: '',
    securityQuestionId: '',
    securityAnswer: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<VerifyInvitationResponse | null>(null);
  const [securityQuestions, setSecurityQuestions] = useState<SecurityQuestion[]>([]);

  useEffect(() => {
    // Get token from URL parameters and verify it
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      verifyToken(tokenParam);
      loadSecurityQuestions();
    } else {
      setError('Invalid or missing token. Please check your email link.');
      setIsVerifying(false);
    }
  }, [searchParams]);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await authService.verifyInvitationToken(tokenToVerify);
      
      if (response.valid) {
        setUserInfo(response);
      } else {
        setError(response.error || 'Invalid or expired invitation token.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify invitation token.');
    } finally {
      setIsVerifying(false);
    }
  };

  const loadSecurityQuestions = async () => {
    try {
      const questions = await authService.getSecurityQuestions();
      setSecurityQuestions(questions);
    } catch (err) {
      console.error('Failed to load security questions:', err);
      // Don't set error here as token verification is more critical
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

    // Validate security question and answer
    if (!formData.securityQuestionId) {
      setError('Please select a security question.');
      setIsLoading(false);
      return;
    }

    if (!formData.securityAnswer || formData.securityAnswer.trim().length < 2) {
      setError('Please provide a valid answer to the security question.');
      setIsLoading(false);
      return;
    }

    try {
      if (!token) {
        setError('Invalid token.');
        setIsLoading(false);
        return;
      }

      const response = await authService.completeSignup(
        token,
        formData.password,
        Number(formData.securityQuestionId),
        formData.securityAnswer
      );
      
      setSuccess(`Account setup completed successfully! Your username is ${response.username}. Redirecting to sign in...`);
      
      // Redirect to sign in after a delay
      setTimeout(() => {
        navigate('/sign-in');
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while setting up your account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <>
        <AuthHeader />
        <AnimatedBackground>
          <Container component="main" maxWidth="sm" sx={{ position: 'relative', zIndex: 10 }}>
            <Paper 
              elevation={8} 
              sx={{ 
                padding: 4, 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                textAlign: 'center',
              }}
            >
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Verifying invitation...
              </Typography>
            </Paper>
          </Container>
        </AnimatedBackground>
      </>
    );
  }

  if (!token || (userInfo && !userInfo.valid)) {
    return (
      <>
        <AuthHeader />
        <AnimatedBackground>
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
        </AnimatedBackground>
      </>
    );
  }

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
                Welcome, {userInfo.first_name} {userInfo.last_name}!<br />
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

              <TextField
                select
                margin="normal"
                required
                fullWidth
                name="securityQuestionId"
                label="Security Question"
                id="securityQuestionId"
                value={formData.securityQuestionId}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <HelpOutline />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">
                  <em>Select a security question</em>
                </MenuItem>
                {securityQuestions.map((question) => (
                  <MenuItem key={question.questionid} value={question.questionid}>
                    {question.questiontext}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                margin="normal"
                required
                fullWidth
                name="securityAnswer"
                label="Security Answer"
                type="text"
                id="securityAnswer"
                value={formData.securityAnswer}
                onChange={handleInputChange}
                helperText="This answer will be used to verify your identity if you forget your password"
              />

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
  </AnimatedBackground>
  </>
);
};

export default FinishSignUp;