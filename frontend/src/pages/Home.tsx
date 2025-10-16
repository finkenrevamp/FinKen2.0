import React from 'react';
import { Link } from 'react-router-dom';
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
} from '@mui/material';
import {
  Dashboard,
  AccountBalance,
  TrendingUp,
  Assignment,
  People,
  Warning,
  CheckCircle,
  Schedule,
  AccountTree,
} from '@mui/icons-material';
import Header from '../components/Header';
import type { User } from '../types/auth';

interface HomeProps {
  user: User;
  onLogout: () => void;
}

const Home: React.FC<HomeProps> = ({ user, onLogout }) => {
  // Mock data for dashboard
  const dashboardStats = {
    totalAccounts: 156,
    pendingJournalEntries: 3,
    expiringPasswords: 2,
    activeUsers: 12,
  };

  const pendingActions = [
    { id: 1, text: '3 journal entries awaiting approval', icon: <Assignment color="warning" /> },
    { id: 2, text: '2 user passwords expiring soon', icon: <Warning color="error" /> },
    { id: 3, text: '1 new user registration pending', icon: <People color="info" /> },
  ];

  const quickActions = [
    {
      title: 'Chart of Accounts',
      description: 'Manage your accounting structure',
      icon: <AccountTree color="primary" />,
      path: '/chart-of-accounts',
      roles: ['Administrator', 'Manager', 'Accountant'],
    },
    {
      title: 'Journal Entries',
      description: 'Create and manage journal entries',
      icon: <Assignment color="primary" />,
      path: '/journal-entries',
      roles: ['Manager', 'Accountant'],
    },
    {
      title: 'Financial Reports',
      description: 'Generate financial statements',
      icon: <TrendingUp color="primary" />,
      path: '/reports',
      roles: ['Administrator', 'Manager'],
    },
    {
      title: 'User Management',
      description: 'Manage system users and permissions',
      icon: <People color="primary" />,
      path: '/users',
      roles: ['Administrator'],
    },
  ];

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17) greeting = 'Good evening';

    return `${greeting}, ${user.firstName}!`;
  };

  const canAccessAction = (actionRoles: string[]) => {
    return actionRoles.includes(user.role);
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

        {/* Important Notifications */}
        {user.role !== 'accountant' && pendingActions.length > 0 && (
          <Alert severity="info" sx={{ mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom>
              Items requiring your attention:
            </Typography>
            <List dense>
              {pendingActions.map((action) => (
                <ListItem key={action.id} sx={{ py: 0 }}>
                  <ListItemIcon>{action.icon}</ListItemIcon>
                  <ListItemText primary={action.text} />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
          {/* Main Content */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
              <Dashboard sx={{ mr: 1, verticalAlign: 'middle' }} />
              Dashboard Overview
            </Typography>

            {/* Statistics Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
              <Card elevation={2}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AccountBalance color="primary" sx={{ mr: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Accounts
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="div">
                    {dashboardStats.totalAccounts}
                  </Typography>
                </CardContent>
              </Card>

              {user.role !== 'accountant' && (
                <Card elevation={2}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Schedule color="warning" sx={{ mr: 1 }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Pending Entries
                      </Typography>
                    </Box>
                    <Typography variant="h4" component="div">
                      {dashboardStats.pendingJournalEntries}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {user.role === 'Administrator' && (
                <>
                  <Card elevation={2}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Warning color="error" sx={{ mr: 1 }} />
                        <Typography variant="subtitle2" color="text.secondary">
                          Expiring Passwords
                        </Typography>
                      </Box>
                      <Typography variant="h4" component="div">
                        {dashboardStats.expiringPasswords}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Card elevation={2}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <People color="success" sx={{ mr: 1 }} />
                        <Typography variant="subtitle2" color="text.secondary">
                          Active Users
                        </Typography>
                      </Box>
                      <Typography variant="h4" component="div">
                        {dashboardStats.activeUsers}
                      </Typography>
                    </CardContent>
                  </Card>
                </>
              )}
            </Box>

            {/* Quick Actions */}
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
              {quickActions
                .filter(action => canAccessAction(action.roles))
                .map((action) => (
                  <Card key={action.title} elevation={1} sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        {action.icon}
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          {action.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {action.description}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" color="primary">
                        Open
                      </Button>
                    </CardActions>
                  </Card>
                ))}
            </Box>
          </Box>

          {/* Sidebar */}
          <Box sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0 }}>
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
                    primary="Last Backup" 
                    secondary="Today at 2:00 AM"
                  />
                </ListItem>
              </List>

              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Journal entry #1234 approved" 
                      secondary="5 minutes ago"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="New user registration received" 
                      secondary="1 hour ago"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Monthly backup completed" 
                      secondary="2 hours ago"
                    />
                  </ListItem>
                </List>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;