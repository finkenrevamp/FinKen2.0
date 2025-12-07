import React, { useState, useRef } from 'react';
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
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  TextField
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EmailIcon from '@mui/icons-material/Email';
import Header from '../components/Header';
import CalendarButton from '../components/CalendarButton';
import HelpButton from '../components/HelpButton';
import type { User } from '../types/auth';
import { reportsService } from '../services/reportsService';
import type { TrialBalanceReport } from '../services/reportsService';
import profileService, { type UserData } from '../services/profileService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface TrialBalanceProps {
  user: User;
  onLogout: () => void;
}

const TrialBalance: React.FC<TrialBalanceProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [exporting, setExporting] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  //date handling
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsService.getTrialBalance(startDate, endDate);
      setReport(data);
    } catch (err: any) {
      console.error('Error fetching trial balance report:', err);
      setError(err.message || 'Failed to load trial balance report');
    } finally {
      setLoading(false);
    }
  };

  /*const exportToPDF = async () => {
    if (!reportRef.current || !report) return;

    try {
      setExporting(true);
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const fileName = `Trial_Balance_${startDate?.format('YYYY-MM-DD')}_to_${endDate?.format('YYYY-MM-DD')}.pdf`;
      
      pdf.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };*/

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
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      
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
    if (!selectedUser || !report || !startDate || !endDate) return;

    try {
      setSendingEmail(true);
      setError(null);
      setSuccessMessage(null);

      const pdfBase64 = await generatePDFBase64();
      if (!pdfBase64) {
        throw new Error('Failed to generate PDF');
      }

      const sizeInBytes = (pdfBase64.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      
      if (sizeInMB > 10) {
        throw new Error(`PDF file is too large (${sizeInMB.toFixed(2)} MB). Maximum size is 10 MB.`);
      }

      const fileName = `Trial_Balance_${startDate}_to_${endDate}.pdf`;
      
      console.log(`Sending email with PDF (${sizeInMB.toFixed(2)} MB) to ${selectedUser.email}...`);
      
      await profileService.sendEmailWithAttachment(selectedUser.id, {
        subject: `FinKen 2.0 - Trial Balance Report (${startDate} to ${endDate})`,
        body: `Dear ${selectedUser.first_name},\n\nPlease find attached the Trial Balance report for the period ${startDate} to ${endDate}.\n\nBest regards,\nFinKen 2.0 Team`,
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
              onClick={fetchTrialBalance}
              disabled={loading}
            >
              Generate Report
            </Button>
          </Stack>
        </Paper>


        
        {/* Date Range Selection 
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Report Period
          </Typography>
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
        */}

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
                Trial Balance
              </Typography>
              <Typography variant="h6" color="text.secondary">
                {startDate} - {endDate}
              </Typography>
              {report && (
                <Box mt={2}>
                  <Chip
                    label={report.is_balanced ? 'Balanced' : `Out of Balance: ${formatAmount(report.difference)}`}
                    color={getBalanceStatusColor(report.is_balanced)}
                    variant="filled"
                    size="medium"
                    sx={{
                      '& .MuiChip-label': {
                        color: 'white',
                      }
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* Main Report Content */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Account Number</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Account Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Debit</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Credit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.accounts && report.accounts.map((account) => (
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

            {/* Footer Note */}
            <Box mt={4} pt={2} borderTop="1px solid" borderColor="divider">
              <Typography variant="caption" color="text.secondary">
                Report Period: {startDate} - {endDate}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Empty State */}
        {!loading && !report && !error && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Select a date range and click "Generate Report" to view the Trial Balance.
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
                  Select a user to send the Trial Balance report via email.
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

export default TrialBalance;
