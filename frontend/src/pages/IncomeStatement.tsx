import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Divider,
  Stack
} from '@mui/material';
import Header from '../components/Header';
import CalendarButton from '../components/CalendarButton';
import EmailButton from '../components/EmailButton';
import HelpButton from '../components/HelpButton';
import type { User } from '../types/auth';
import reportsService from '../services/reportsService';
import type { IncomeStatementReport } from '../services/reportsService';

interface IncomeStatementProps {
  user: User;
  onLogout: () => void;
}

const IncomeStatement: React.FC<IncomeStatementProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<IncomeStatementReport | null>(null);
  
  // Default to current year (Jan 1 to Dec 31)
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsService.getIncomeStatement(startDate, endDate);
      setReport(data);
    } catch (err: any) {
      console.error('Error fetching income statement report:', err);
      setError(err.message || 'Failed to load income statement report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []); // Load on mount

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string): string => {
    // Parse date manually to avoid timezone issues
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', width: '100%' }}>
      <Header user={user} onLogout={onLogout} />
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pt: 10 }}>
        {/* Action Buttons */}
        <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
          <Stack direction="column" spacing={2}>
            <CalendarButton />
            <EmailButton />
            <HelpButton />
          </Stack>
        </Box>

        {/* Date Range Selection */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Report Period
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button 
              variant="contained" 
              onClick={fetchReport}
              disabled={loading}
            >
              Generate Report
            </Button>
          </Stack>
        </Paper>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        )}

        {/* Report Display */}
        {!loading && report && (
          <Paper sx={{ p: 4 }}>
            {/* Report Header */}
            <Box textAlign="center" mb={4}>
              <Typography variant="h4" gutterBottom fontWeight="bold">
                FinKen Financial System
              </Typography>
              <Typography variant="h5" gutterBottom>
                Income Statement
              </Typography>
              <Typography variant="h6" color="text.secondary">
                For the Period Ended {report.period.formatted_end_date}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Main Report Content */}
            <TableContainer>
              <Table>
                <TableBody>
                  {/* Revenue Section */}
                  <TableRow>
                    <TableCell sx={{ border: 'none', pl: 0 }}>
                      <Typography variant="h6" fontWeight="bold">
                        Revenue
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ border: 'none', pr: 0 }}></TableCell>
                  </TableRow>

                  {/* Revenue Details */}
                  {report.revenue.details.length > 0 ? (
                    report.revenue.details.map((detail, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ border: 'none', pl: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            {detail.account_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ border: 'none', pr: 0 }}>
                          <Typography variant="body2">
                            {formatCurrency(detail.amount)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell sx={{ border: 'none', pl: 4 }}>
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          No revenue accounts
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ border: 'none', pr: 0 }}></TableCell>
                    </TableRow>
                  )}

                  {/* Total Revenue */}
                  <TableRow>
                    <TableCell sx={{ border: 'none', pl: 0, pt: 2 }}>
                      <Typography variant="body1" fontWeight="bold">
                        Total Revenue
                      </Typography>
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        border: 'none', 
                        pr: 0, 
                        pt: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(report.revenue.total)}
                      </Typography>
                    </TableCell>
                  </TableRow>

                  {/* Expenses Section */}
                  <TableRow>
                    <TableCell sx={{ border: 'none', pl: 0, pt: 3 }}>
                      <Typography variant="h6" fontWeight="bold">
                        Expenses
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ border: 'none', pr: 0, pt: 3 }}></TableCell>
                  </TableRow>

                  {/* Expense Details */}
                  {report.expenses.details.length > 0 ? (
                    report.expenses.details.map((detail, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ border: 'none', pl: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            {detail.account_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ border: 'none', pr: 0 }}>
                          <Typography variant="body2">
                            {formatCurrency(detail.amount)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell sx={{ border: 'none', pl: 4 }}>
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          No expense accounts
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ border: 'none', pr: 0 }}></TableCell>
                    </TableRow>
                  )}

                  {/* Total Expenses */}
                  <TableRow>
                    <TableCell sx={{ border: 'none', pl: 0, pt: 2 }}>
                      <Typography variant="body1" fontWeight="bold">
                        Total Expenses
                      </Typography>
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        border: 'none', 
                        pr: 0, 
                        pt: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(report.expenses.total)}
                      </Typography>
                    </TableCell>
                  </TableRow>

                  {/* Net Income */}
                  <TableRow>
                    <TableCell sx={{ border: 'none', pl: 0, pt: 3 }}>
                      <Typography variant="h6" fontWeight="bold">
                        Net Income
                      </Typography>
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        border: 'none', 
                        pr: 0, 
                        pt: 3,
                        borderBottom: '3px double',
                        borderColor: 'primary.main'
                      }}
                    >
                      <Typography 
                        variant="h6" 
                        fontWeight="bold" 
                        color={parseFloat(report.net_income) >= 0 ? 'primary' : 'error'}
                      >
                        {formatCurrency(report.net_income)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Footer Note */}
            <Box mt={4} pt={2} borderTop="1px solid" borderColor="divider">
              <Typography variant="caption" color="text.secondary">
                Report Period: {formatDate(report.period.start_date)} - {formatDate(report.period.end_date)}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Empty State */}
        {!loading && !report && !error && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Select a date range and click "Generate Report" to view the Income Statement.
            </Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default IncomeStatement;
