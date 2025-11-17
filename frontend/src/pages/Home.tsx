import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Dashboard,
  TrendingUp,
  Assignment,
  People,
  Assessment,
} from '@mui/icons-material';
import Header from '../components/Header';
import type { User } from '../types/auth';
import reportsService from '../services/reportsService';
import { journalEntriesService, type JournalEntry } from '../services/journalEntriesService';
import {
  calculateFinancialRatios,
  getRatioStatus,
  getStatusColor,
  getRatioMetadata,
  formatRatioValue,
  type FinancialRatios,
} from '../utils/financialRatios';

interface HomeProps {
  user: User;
  onLogout: () => void;
}

const Home: React.FC<HomeProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financialRatios, setFinancialRatios] = useState<FinancialRatios | null>(null);
  const [pendingJournalEntries, setPendingJournalEntries] = useState<JournalEntry[]>([]);
  
  // Default to current year
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  // Fetch financial data and calculate ratios
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch Income Statement and Balance Sheet in parallel
        const [incomeStatement, balanceSheet] = await Promise.all([
          reportsService.getIncomeStatement(startDate, endDate),
          reportsService.getBalanceSheet(startDate, endDate),
        ]);

        // Calculate financial ratios
        const ratios = calculateFinancialRatios(incomeStatement, balanceSheet);
        setFinancialRatios(ratios);
      } catch (err: any) {
        console.error('Error fetching financial data:', err);
        setError(err.message || 'Failed to load financial data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // Fetch pending journal entries
  useEffect(() => {
    const fetchPendingEntries = async () => {
      try {
        // Only fetch if user is Manager or Administrator
        if (user.role === 'Manager' || user.role === 'Administrator') {
          const entries = await journalEntriesService.getAllJournalEntries({ status: 'Pending' });
          setPendingJournalEntries(entries);
        }
      } catch (err: any) {
        console.error('Error fetching pending journal entries:', err);
        // Don't show error for this, just log it
      }
    };

    fetchPendingEntries();
  }, [user.role]);

  // Render a financial ratio card
  const renderRatioCard = (ratioName: keyof FinancialRatios) => {
    if (!financialRatios) return null;
    
    const value = financialRatios[ratioName];
    const status = getRatioStatus(ratioName, value);
    const color = getStatusColor(status);
    const metadata = getRatioMetadata(ratioName);
    
    return (
      <Card
        key={ratioName}
        elevation={4}
        sx={{
          height: '100%',
          borderRadius: 2,
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 8,
          },
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
              {metadata.label}
            </Typography>
            <Chip
              label={status === 'good' ? 'Good' : status === 'warning' ? 'Warning' : 'Critical'}
              color={color}
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
          <Typography 
            variant="h3" 
            component="div" 
            sx={{ 
              mb: 2, 
              fontWeight: 'bold',
              color: color === 'success' ? 'success.main' : color === 'warning' ? 'warning.main' : 'error.main',
            }}
          >
            {formatRatioValue(value, metadata.unit)}
          </Typography>
          <Box sx={{ 
            p: 2, 
            backgroundColor: 'rgba(0, 0, 0, 0.02)', 
            borderRadius: 1,
            border: '1px solid rgba(0, 0, 0, 0.08)'
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 500 }}>
              <strong>Formula:</strong> {metadata.formula}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
              <strong>Normal Range:</strong> {metadata.normalRange}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17) greeting = 'Good evening';

    return `${greeting}, ${user.firstName}!`;
  };


  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', width: '100%' }}>
      <Header user={user} onLogout={onLogout} />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pt: 10 }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            {getWelcomeMessage()}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Welcome to your FinKen 2.0 dashboard
          </Typography>
        </Box>

        {/* Quick Access to Registration Requests (Admin only) */}
        {user.role === 'Administrator' && (
          <Card 
            elevation={3} 
            sx={{ 
              mb: 4, 
              border: '2px solid', 
              borderColor: 'primary.main',
              '&:hover': {
                boxShadow: 6,
                transform: 'translateY(-2px)',
                transition: 'all 0.3s ease-in-out'
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <People color="primary" sx={{ mr: 2, fontSize: 32 }} />
                <Box>
                  <Typography variant="h5" component="h2" gutterBottom>
                    Manage Registration Requests
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Review and approve pending user registration requests
                  </Typography>
                </Box>
              </Box>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button 
                component={Link}
                to="/registrations"
                variant="contained" 
                size="large"
                startIcon={<People />}
              >
                View Registration Requests
              </Button>
            </CardActions>
          </Card>
        )}

        {/* Important Messages - Pending Journal Entries */}
        {(user.role === 'Manager' || user.role === 'Administrator') && pendingJournalEntries.length > 0 && (
          <Alert severity="warning" sx={{ mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Items Requiring Your Attention:
            </Typography>
            <List dense>
              <ListItem sx={{ py: 0 }}>
                <ListItemIcon>
                  <Assignment color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary={`${pendingJournalEntries.length} journal ${pendingJournalEntries.length === 1 ? 'entry' : 'entries'} awaiting approval`}
                  secondary={
                    <Button
                      size="small"
                      onClick={() => navigate('/journalize')}
                      sx={{ mt: 0.5 }}
                    >
                      View Entries
                    </Button>
                  }
                />
                </ListItem>
            </List>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Financial Ratios Dashboard */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            mb: 4,
            background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 50%, #0d47a1 100%)',
            color: 'white',
            borderRadius: 3
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ mr: 2, fontSize: 40 }} />
              <Box>
                <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  Financial Ratios Dashboard
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress sx={{ color: 'white' }} size={60} />
            </Box>
          ) : financialRatios ? (
            <Box sx={{ mt: 3 }}>
              {/* Profitability Ratios */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Assessment sx={{ mr: 1 }} />
                  Profitability Ratios
                </Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
                  gap: 3
                }}>
                  {renderRatioCard('netProfitMargin')}
                  {renderRatioCard('returnOnAssets')}
                  {renderRatioCard('returnOnEquity')}
                </Box>
              </Box>

              {/* Liquidity Ratios */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center' }}>
                  <TrendingUp sx={{ mr: 1 }} />
                  Liquidity Ratios
                </Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
                  gap: 3
                }}>
                  {renderRatioCard('currentRatio')}
                </Box>
              </Box>

              {/* Leverage Ratios */}
              <Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Dashboard sx={{ mr: 1 }} />
                  Leverage Ratios
                </Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
                  gap: 3
                }}>
                  {renderRatioCard('debtToAssets')}
                  {renderRatioCard('debtToEquity')}
                  {renderRatioCard('longTermDebtToEquity')}
                </Box>
              </Box>
            </Box>
          ) : (
            <Alert severity="info" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
              No financial data available. Please ensure you have approved journal entries and account balances.
            </Alert>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default Home;