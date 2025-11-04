import React, { useState, useCallback } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Stack
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import Header from '../components/Header';
import type { User } from '../types/auth';
import { reportsService } from '../services/reportsService';
import type { TrialBalanceReport } from '../services/reportsService';

interface TrialBalanceProps {
  user: User;
  onLogout: () => void;
}

const TrialBalance: React.FC<TrialBalanceProps> = ({ user, onLogout }) => {
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [loading, setLoading] = useState(false);

  const handleDateChange = {
    start: (newValue: unknown) => {
      if (dayjs.isDayjs(newValue)) {
        setStartDate(newValue);
      }
    },
    end: (newValue: unknown) => {
      if (dayjs.isDayjs(newValue)) {
        setEndDate(newValue);
      }
    }
  };
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TrialBalanceReport | null>(null);

  const fetchTrialBalance = useCallback(async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await reportsService.getTrialBalance(
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
      );
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trial balance');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };

  const getBalanceStatusColor = (isBalanced: boolean) => {
    return isBalanced ? 'success' : 'error';
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', width: '100%' }}>
      <Header user={user} onLogout={onLogout} />
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pt: 10 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h3" component="h1">
            Trial Balance
          </Typography>
          {report && (
            <Chip
              label={report.is_balanced ? 'Balanced' : `Out of Balance: ${formatAmount(report.difference)}`}
              color={getBalanceStatusColor(report.is_balanced)}
              variant="filled"
              size="medium"
            />
          )}
        </Box>

        <Paper sx={{ p: 3, mb: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={handleDateChange.start}
                format="YYYY-MM-DD"
                slotProps={{
                  textField: { size: "small" }
                }}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={handleDateChange.end}
                format="YYYY-MM-DD"
                slotProps={{
                  textField: { size: "small" }
                }}
              />
            </LocalizationProvider>
            <Button 
              variant="contained" 
              onClick={fetchTrialBalance}
              disabled={loading || !startDate || !endDate}
            >
              Generate Report
            </Button>
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : report && (
          <TableContainer component={Paper}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Account Number</TableCell>
                  <TableCell>Account Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="right">Credit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.accounts.map((account) => (
                  <TableRow key={account.account_id}>
                    <TableCell>{account.account_number}</TableCell>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell>{account.category}</TableCell>
                    <TableCell align="right">
                      {account.debit_balance !== "0.00" ? formatAmount(account.debit_balance) : ""}
                    </TableCell>
                    <TableCell align="right">
                      {account.credit_balance !== "0.00" ? formatAmount(account.credit_balance) : ""}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ 
                  '& td': { 
                    fontWeight: 'bold',
                    borderTop: 2,
                    backgroundColor: (theme) => theme.palette.action.hover
                  } 
                }}>
                  <TableCell colSpan={3}>Totals</TableCell>
                  <TableCell align="right">{formatAmount(report.total_debits)}</TableCell>
                  <TableCell align="right">{formatAmount(report.total_credits)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </Box>
  );
};

export default TrialBalance;
