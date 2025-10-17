import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import Header from '../components/Header';
import type { User } from '../types/auth';

interface RetainedEarningsProps {
  user: User;
  onLogout: () => void;
}

const RetainedEarnings: React.FC<RetainedEarningsProps> = ({ user, onLogout }) => {
  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', width: '100%' }}>
      <Header user={user} onLogout={onLogout} />
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pt: 10 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Retained Earnings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page will contain the retained earnings report.
        </Typography>
      </Container>
    </Box>
  );
};

export default RetainedEarnings;
