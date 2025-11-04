import React, { useState, useEffect, useRef } from 'react';
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
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import Header from '../components/Header';
import CalendarButton from '../components/CalendarButton';
import HelpButton from '../components/HelpButton';
import type { User } from '../types/auth';
import reportsService from '../services/reportsService';
import type { RetainedEarningsReport } from '../services/reportsService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface RetainedEarningsProps {
  user: User;
  onLogout: () => void;
}

const RetainedEarnings: React.FC<RetainedEarningsProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<RetainedEarningsReport | null>(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Default to current year (Jan 1 to Dec 31)
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsService.getRetainedEarnings(startDate, endDate);
      setReport(data);
    } catch (err: any) {
      console.error('Error fetching retained earnings report:', err);
      setError(err.message || 'Failed to load retained earnings report');
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

  const exportToPDF = async () => {
    if (!reportRef.current || !report) return;

    try {
      setExporting(true);
      
      // Create a canvas from the report element
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Generate filename with date range
      const fileName = `Retained_Earnings_${startDate}_to_${endDate}.pdf`;
      
      // Save the PDF
      pdf.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', width: '100%' }}>
      <Header user={user} onLogout={onLogout} />
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pt: 10 }}>
        {/* Export PDF Button - Top Right */}
        {report && !loading && (
          <Box sx={{ position: 'absolute', top: 80, right: 40, zIndex: 1000 }}>
            <Tooltip title="Export to PDF">
              <IconButton
                color="primary"
                onClick={exportToPDF}
                disabled={exporting}
                sx={{
                  bgcolor: 'background.paper',
                  boxShadow: 2,
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'white',
                  },
                }}
              >
                <PictureAsPdfIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
          <Stack direction="column" spacing={2}>
            <CalendarButton />
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
          <Paper sx={{ p: 4 }} ref={reportRef}>
            {/* Report Header */}
            <Box textAlign="center" mb={4}>
              <Typography variant="h4" gutterBottom fontWeight="bold">
                FinKen Financial System
              </Typography>
              <Typography variant="h5" gutterBottom>
                Statement of Retained Earnings
              </Typography>
              <Typography variant="h6" color="text.secondary">
                For the Year Ended {report.period.formatted_end_date}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Main Report Content */}
            <TableContainer>
              <Table>
                <TableBody>
                  {/* Beginning Retained Earnings */}
                  <TableRow>
                    <TableCell sx={{ border: 'none', pl: 0 }}>
                      <Typography variant="body1">
                        Retained Earnings, Beginning Balance
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ border: 'none', pr: 0 }}>
                      <Typography variant="body1">
                        {formatCurrency(report.beginning_retained_earnings)}
                      </Typography>
                    </TableCell>
                  </TableRow>

                  {/* Net Income Section */}
                  <TableRow>
                    <TableCell sx={{ border: 'none', pl: 0, pt: 3 }}>
                      <Typography variant="body1" fontWeight="bold">
                        Add: Net Income
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ border: 'none', pr: 0, pt: 3 }}></TableCell>
                  </TableRow>

                  {/* Revenue Details */}
                  <TableRow>
                    <TableCell sx={{ border: 'none', pl: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Total Revenue
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ border: 'none', pr: 0 }}>
                      <Typography variant="body2">
                        {formatCurrency(report.net_income.revenue.total)}
                      </Typography>
                    </TableCell>
                  </TableRow>

                  {/* Expense Details */}
                  <TableRow>
                    <TableCell sx={{ border: 'none', pl: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Less: Total Expenses
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ border: 'none', pr: 0 }}>
                      <Typography variant="body2">
                        ({formatCurrency(report.net_income.expenses.total)})
                      </Typography>
                    </TableCell>
                  </TableRow>

                  {/* Net Income Total */}
                  <TableRow>
                    <TableCell sx={{ border: 'none', pl: 4, pb: 3 }}>
                      <Typography variant="body1" fontWeight="medium">
                        Net Income
                      </Typography>
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        border: 'none', 
                        pr: 0, 
                        pb: 3,
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="body1" fontWeight="medium">
                        {formatCurrency(report.net_income.total)}
                      </Typography>
                    </TableCell>
                  </TableRow>

                  {/* Dividends (if any) */}
                  {parseFloat(report.dividends.total) > 0 && (
                    <>
                      <TableRow>
                        <TableCell sx={{ border: 'none', pl: 0, pt: 2 }}>
                          <Typography variant="body1" fontWeight="bold">
                            Less: Dividends
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
                          <Typography variant="body1">
                            ({formatCurrency(report.dividends.total)})
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </>
                  )}

                  {/* Ending Retained Earnings */}
                  <TableRow>
                    <TableCell sx={{ border: 'none', pl: 0, pt: 2 }}>
                      <Typography variant="h6" fontWeight="bold">
                        Retained Earnings, Ending Balance
                      </Typography>
                    </TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        border: 'none', 
                        pr: 0, 
                        pt: 2,
                        borderBottom: '3px double',
                        borderColor: 'primary.main'
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        {formatCurrency(report.ending_retained_earnings)}
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
              Select a date range and click "Generate Report" to view the Retained Earnings Statement.
            </Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default RetainedEarnings;
