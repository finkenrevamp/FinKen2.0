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
  Divider,
  CircularProgress,
  Chip,
  Stack,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Dashboard,
  TrendingUp,
  Assignment,
  People,
  Warning,
  CheckCircle,
  Schedule,
  AccountTree,
  Create,
  History,
  Assessment,
  ArrowDropDown,
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
  const [reportsMenuAnchor, setReportsMenuAnchor] = useState<null | HTMLElement>(null);
  const [adminMenuAnchor, setAdminMenuAnchor] = useState<null | HTMLElement>(null);
  
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

  const handleReportsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setReportsMenuAnchor(event.currentTarget);
  };

  const handleReportsMenuClose = () => {
    setReportsMenuAnchor(null);
  };

  const handleReportsNavigation = (path: string) => {
    handleReportsMenuClose();
    navigate(path);
  };

  const handleAdminMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAdminMenuAnchor(event.currentTarget);
  };

  const handleAdminMenuClose = () => {
    setAdminMenuAnchor(null);
  };

  const handleAdminNavigation = (path: string) => {
    handleAdminMenuClose();
    navigate(path);
  };

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
        elevation={2}
        sx={{
          height: '100%',
          borderLeft: `4px solid`,
          borderLeftColor: color === 'success' ? 'success.main' : color === 'warning' ? 'warning.main' : 'error.main',
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              {metadata.label}
            </Typography>
            <Chip
              label={status === 'good' ? 'Good' : status === 'warning' ? 'Warning' : 'Critical'}
              color={color}
              size="small"
            />
          </Box>
          <Typography variant="h4" component="div" sx={{ mb: 1, color: `${color}.main` }}>
            {formatRatioValue(value, metadata.unit)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Formula: {metadata.formula}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Normal Range: {metadata.normalRange}
          </Typography>
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

        {/* Quick Access to Registration Requests (Admin/Manager only) */}
        {(user.role === 'Administrator' || user.role === 'Manager') && (
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
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
              <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
              Financial Ratios Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                    </Typography>
                  </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : financialRatios ? (
            <>
              {/* Profitability Ratios */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, fontWeight: 'bold' }}>
                Profitability Ratios
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                {renderRatioCard('netProfitMargin')}
                {renderRatioCard('returnOnAssets')}
                {renderRatioCard('returnOnEquity')}
              </Box>

              {/* Liquidity Ratios */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, fontWeight: 'bold' }}>
                Liquidity Ratios
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                {renderRatioCard('currentRatio')}
              </Box>

              {/* Leverage Ratios */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, fontWeight: 'bold' }}>
                Leverage Ratios
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                {renderRatioCard('debtToAssets')}
                {renderRatioCard('debtToEquity')}
                {renderRatioCard('longTermDebtToEquity')}
              </Box>
            </>
          ) : (
            <Alert severity="info">
              No financial data available. Please ensure you have approved journal entries and account balances.
            </Alert>
          )}
        </Paper>

        {/* Quick Navigation Menu - Role-Based Access */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            <Dashboard sx={{ mr: 1, verticalAlign: 'middle' }} />
            Quick Navigation
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {/* Journalize Button - All roles */}
            <Button
              variant="contained"
              startIcon={<Create />}
              onClick={() => navigate('/journalize')}
              sx={{ textTransform: 'none' }}
            >
              Journalize
            </Button>

            {/* Chart of Accounts - All roles */}
            <Button
              variant="contained"
              startIcon={<AccountTree />}
              onClick={() => navigate('/chart-of-accounts')}
              sx={{ textTransform: 'none' }}
            >
              Chart of Accounts
            </Button>

            {/* Event Logs - All roles */}
            <Button
              variant="contained"
              startIcon={<History />}
              onClick={() => navigate('/event-logs')}
              sx={{ textTransform: 'none' }}
            >
              Event Logs
            </Button>

            {/* Reports Dropdown - All roles */}
            <Button
              variant="contained"
              startIcon={<Assessment />}
              endIcon={<ArrowDropDown />}
              onClick={handleReportsMenuOpen}
              sx={{ textTransform: 'none' }}
            >
              Reports
            </Button>
            <Menu
              anchorEl={reportsMenuAnchor}
              open={Boolean(reportsMenuAnchor)}
              onClose={handleReportsMenuClose}
            >
              <MenuItem onClick={() => handleReportsNavigation('/trial-balance')}>
                Trial Balance
              </MenuItem>
              <MenuItem onClick={() => handleReportsNavigation('/income-statement')}>
                Income Statement
              </MenuItem>
              <MenuItem onClick={() => handleReportsNavigation('/retained-earnings')}>
                Retained Earnings
              </MenuItem>
              <MenuItem onClick={() => handleReportsNavigation('/balance-sheet')}>
                Balance Sheet
              </MenuItem>
            </Menu>

            {/* Admin Utilities - Administrator only */}
              {user.role === 'Administrator' && (
                <>
                <Button
                  variant="contained"
                  color="secondary"
                  endIcon={<ArrowDropDown />}
                  onClick={handleAdminMenuOpen}
                  sx={{ textTransform: 'none' }}
                >
                  Admin Utilities
                </Button>
                <Menu
                  anchorEl={adminMenuAnchor}
                  open={Boolean(adminMenuAnchor)}
                  onClose={handleAdminMenuClose}
                >
                  <MenuItem onClick={() => handleAdminNavigation('/users')}>
                    <People sx={{ mr: 1 }} />
                    Users
                  </MenuItem>
                  <MenuItem onClick={() => handleAdminNavigation('/registrations')}>
                    <People sx={{ mr: 1 }} />
                    Registrations
                  </MenuItem>
                  <MenuItem onClick={() => handleAdminNavigation('/expiring-passwords')}>
                    <Warning sx={{ mr: 1 }} />
                          Expiring Passwords
                  </MenuItem>
                </Menu>
                </>
              )}
          </Stack>
        </Paper>

        {/* Sidebar */}
        <Box sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0, ml: 'auto' }}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="System Online" 
                    secondary="All services operational"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Database Connected" 
                    secondary="Data synchronization active"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <Schedule color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Report Period" 
                    secondary={`${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`}
                  />
                </ListItem>
              </List>

              {/* Pending Journal Entries Summary */}
              {(user.role === 'Manager' || user.role === 'Administrator') && pendingJournalEntries.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Pending Actions
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <Assignment color="warning" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={`${pendingJournalEntries.length} Journal ${pendingJournalEntries.length === 1 ? 'Entry' : 'Entries'}`}
                          secondary="Awaiting approval"
                        />
                      </ListItem>
                    </List>
                  </Box>
                </>
              )}
            </Paper>
          </Box>
      </Container>
    </Box>
  );
};

export default Home;