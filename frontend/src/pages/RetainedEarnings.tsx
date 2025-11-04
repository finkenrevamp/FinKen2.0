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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EmailIcon from '@mui/icons-material/Email';
import Header from '../components/Header';
import CalendarButton from '../components/CalendarButton';
import HelpButton from '../components/HelpButton';
import type { User } from '../types/auth';
import reportsService from '../services/reportsService';
import type { RetainedEarningsReport } from '../services/reportsService';
import profileService, { type UserData } from '../services/profileService';
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
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  const generatePDFBase64 = async (): Promise<string | null> => {
    if (!reportRef.current || !report) return null;

    try {
      // Create a canvas from the report element with optimized settings
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5, // Reduced from 2 to make smaller file
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200 // Set consistent width for better rendering
      });

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true // Enable compression
      });

      // Add image to PDF with compression
      const imgData = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG with 80% quality instead of PNG
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

      // Get base64 string (remove the data:application/pdf;base64, prefix)
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      
      // Log the size for debugging
      const sizeInKB = Math.round((pdfBase64.length * 3) / 4 / 1024);
      console.log(`PDF size: ${sizeInKB} KB`);
      
      return pdfBase64;
    } catch (err) {
      console.error('Error generating PDF:', err);
      return null;
    }
  };

  const handleOpenEmailDialog = async () => {
    setEmailDialogOpen(true);
    setLoadingUsers(true);
    setError(null);

    try {
      const allUsers = await profileService.getUsersForEmail();
      setUsers(allUsers);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCloseEmailDialog = () => {
    setEmailDialogOpen(false);
    setSelectedUser(null);
    setSuccessMessage(null);
  };

  const handleSendEmail = async () => {
    if (!selectedUser || !report) return;

    try {
      setSendingEmail(true);
      setError(null);
      setSuccessMessage(null);

      // Generate PDF as base64
      const pdfBase64 = await generatePDFBase64();
      if (!pdfBase64) {
        throw new Error('Failed to generate PDF');
      }

      // Check PDF size (Mailjet has a 15MB limit for attachments)
      const sizeInBytes = (pdfBase64.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      
      if (sizeInMB > 10) {
        throw new Error(`PDF file is too large (${sizeInMB.toFixed(2)} MB). Maximum size is 10 MB.`);
      }

      const fileName = `Retained_Earnings_${startDate}_to_${endDate}.pdf`;
      
      console.log(`Sending email with PDF (${sizeInMB.toFixed(2)} MB) to ${selectedUser.email}...`);
      
      // Send email with attachment
      await profileService.sendEmailWithAttachment(selectedUser.id, {
        subject: `FinKen 2.0 - Retained Earnings Report (${startDate} to ${endDate})`,
        body: `Dear ${selectedUser.first_name},\n\nPlease find attached the Retained Earnings report for the period ${startDate} to ${endDate}.\n\nBest regards,\nFinKen 2.0 Team`,
        attachment_filename: fileName,
        attachment_content: pdfBase64,
        attachment_content_type: 'application/pdf'
      });

      setSuccessMessage(`Email sent successfully to ${selectedUser.email}`);
      setTimeout(() => {
        handleCloseEmailDialog();
      }, 2000);
    } catch (err: any) {
      console.error('Error sending email:', err);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to send email';
      if (err.message) {
        if (err.message.includes('Connection aborted') || err.message.includes('RemoteDisconnected')) {
          errorMessage = 'Connection timeout. The PDF might be too large. Try a shorter date range or contact support.';
        } else if (err.message.includes('too large')) {
          errorMessage = err.message;
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', width: '100%' }}>
      <Header user={user} onLogout={onLogout} />
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pt: 10 }}>
        {/* Export PDF and Email Buttons - Top Right */}
        {report && !loading && (
          <Box sx={{ position: 'absolute', top: 80, right: 40, zIndex: 1000 }}>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Email PDF">
                <IconButton
                  color="primary"
                  onClick={handleOpenEmailDialog}
                  disabled={exporting || sendingEmail}
                  sx={{
                    bgcolor: 'background.paper',
                    boxShadow: 2,
                    '&:hover': {
                      bgcolor: 'primary.main',
                      color: 'white',
                    },
                  }}
                >
                  <EmailIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export to PDF">
                <IconButton
                  color="primary"
                  onClick={exportToPDF}
                  disabled={exporting || sendingEmail}
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
            </Stack>
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
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Success Message */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
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
                Addams & Family Inc. 
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

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onClose={handleCloseEmailDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Email Report to User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {loadingUsers ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Select a user to send the Retained Earnings report via email.
                </Typography>
                <Autocomplete
                  options={users}
                  getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.email})`}
                  value={selectedUser}
                  onChange={(_, newValue) => setSelectedUser(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select User"
                      margin="normal"
                      fullWidth
                    />
                  )}
                  disabled={sendingEmail}
                />
                {successMessage && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {successMessage}
                  </Alert>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmailDialog} disabled={sendingEmail}>
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            variant="contained"
            disabled={!selectedUser || sendingEmail || loadingUsers}
            startIcon={sendingEmail ? <CircularProgress size={20} /> : <EmailIcon />}
          >
            {sendingEmail ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RetainedEarnings;
