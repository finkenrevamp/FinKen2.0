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
import type { BalanceSheetReport } from '../services/reportsService';
import profileService, { type UserData } from '../services/profileService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface BalanceSheetProps {
  user: User;
  onLogout: () => void;
}

const BalanceSheet: React.FC<BalanceSheetProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [exporting, setExporting] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsService.getBalanceSheet(startDate, endDate);
      setReport(data);
    } catch (err: any) {
      console.error('Error fetching balance sheet report:', err);
      setError(err.message || 'Failed to load balance sheet report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Helper to check if account is contra-asset (reduces assets)
  const isContraAsset = (accountName: string): boolean => {
    const lowerName = accountName.toLowerCase();
    return (lowerName.includes('accumulated depreciation') ||
            lowerName.includes('accumulated deprecation') ||  // Handle typo
            lowerName.includes('accumulated amortization') ||
            lowerName.includes('allowance for doubtful') ||
            lowerName.includes('contra'));
  };

  const exportToPDF = async () => {
    if (!reportRef.current || !report) return;
    try {
      setExporting(true);
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Balance_Sheet_${startDate}_to_${endDate}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF');
    } finally {
      setExporting(false);
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
      const canvas = await html2canvas(reportRef.current!);
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, (canvas.height * 210) / canvas.width);
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      await profileService.sendEmailWithAttachment(selectedUser.id, {
        subject: `FinKen 2.0 - Balance Sheet (${startDate} to ${endDate})`,
        body: `Dear ${selectedUser.first_name},\n\nPlease find attached the Balance Sheet for the period ${startDate} to ${endDate}.\n\nBest regards,\nFinKen 2.0 Team`,
        attachment_filename: `Balance_Sheet_${startDate}_to_${endDate}.pdf`,
        attachment_content: pdfBase64,
        attachment_content_type: 'application/pdf'
      });
      setSuccessMessage(`Email sent successfully to ${selectedUser.email}`);
      setTimeout(() => handleCloseEmailDialog(), 2000);
    } catch (err: any) {
      console.error('Error sending email:', err);
      setError(err.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', width: '100%' }}>
      <Header user={user} onLogout={onLogout} />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pt: 10 }}>

        {/* Export & Email Buttons */}
        {report && !loading && (
          <Box sx={{ position: 'absolute', top: 80, right: 40, zIndex: 1000 }}>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Email PDF">
                <IconButton onClick={handleOpenEmailDialog} disabled={exporting || sendingEmail}><EmailIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Export PDF">
                <IconButton onClick={exportToPDF} disabled={exporting || sendingEmail}><PictureAsPdfIcon /></IconButton>
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

        {/* Date Range */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Report Period</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField type="date" label="Start Date" value={startDate} onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField type="date" label="End Date" value={endDate} onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Button variant="contained" onClick={fetchReport} disabled={loading}>Generate Report</Button>
          </Stack>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 3 }}>{successMessage}</Alert>}
        {loading && <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>}

        {/* Report */}
        {!loading && report && (
          <Paper sx={{ p: 4 }} ref={reportRef}>
            <Box textAlign="center" mb={4}>
              <Typography variant="h4" fontWeight="bold">Addams & Family Inc.</Typography>
              <Typography variant="h5">Balance Sheet</Typography>
              <Typography variant="h6" color="text.secondary">As of {report.period.formatted_end_date}</Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
              {/* LEFT COLUMN - ASSETS */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight="bold" mb={2}>Assets</Typography>
                {/* Regular Assets */}
                {report.assets
                  .filter(asset => !isContraAsset(asset.account_name))
                  .map(asset => (
                    <Box
                      key={asset.account_name}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        pl: 2,
                        mb: 1.5
                      }}
                    >
                      <Typography>{asset.account_name}</Typography>
                      <Typography>{formatCurrency(asset.amount)}</Typography>
                    </Box>
                  ))}

                {/* Contra-Assets (subtractions) */}
                {report.assets
                  .filter(asset => isContraAsset(asset.account_name))
                  .map(asset => {
                    const amount = parseFloat(asset.amount);
                    return (
                      <Box
                        key={asset.account_name}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          pl: 4,
                          mb: 1.5
                        }}
                      >
                        <Typography>{asset.account_name}</Typography>
                        <Typography>({formatCurrency(amount)})</Typography>
                      </Box>
                    );
                  })}

                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography fontWeight="bold" variant="h6">Total Assets</Typography>
                  <Typography fontWeight="bold" variant="h6">{formatCurrency(report.total_assets)}</Typography>
                </Box>
              </Box>

              {/* RIGHT COLUMN - LIABILITIES & EQUITY */}
              <Box sx={{ flex: 1 }}>
                {/* Liabilities Section */}
                <Typography variant="h6" fontWeight="bold" mb={2}>Liabilities</Typography>
                {report.liabilities.map(liab => (
                  <Box key={liab.account_name} sx={{ display: 'flex', justifyContent: 'space-between', pl: 2, mb: 1.5 }}>
                    <Typography>{liab.account_name}</Typography>
                    <Typography>{formatCurrency(liab.amount)}</Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 2 }} />

                {/* Equity Section */}
                <Typography variant="h6" fontWeight="bold" mb={2} mt={3}>Equity</Typography>
                {report.equity.map(eq => (
                  <Box key={eq.account_name} sx={{ display: 'flex', justifyContent: 'space-between', pl: 2, mb: 1.5 }}>
                    <Typography>{eq.account_name}</Typography>
                    <Typography>{formatCurrency(eq.amount)}</Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography fontWeight="bold" variant="h6">Total Liabilities & Equity</Typography>
                  <Typography fontWeight="bold" variant="h6">{formatCurrency(report.total_liabilities_equity)}</Typography>
                </Box>
              </Box>
            </Box>

            {/* Error Message if Totals Don't Match */}
            {formatCurrency(report.total_assets) !== formatCurrency(report.total_liabilities_equity) && (
              <Box sx={{ pt: 2, textAlign: 'center' }}>
                <Typography fontWeight="bold" color="error" fontSize={24}>
                  ⚠️ Assets do not match Liabilities & Equity
                </Typography>
              </Box>
            )}

            <Box mt={4} pt={2} borderTop="1px solid" borderColor="divider">
              <Typography variant="caption" color="text.secondary">
                Report Period: {report.period.start_date} - {report.period.end_date}
              </Typography>
            </Box>
          </Paper>
        )}

        {!loading && !report && !error && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Select a date range and click "Generate Report" to view the Balance Sheet.
            </Typography>
          </Paper>
        )}
      </Container>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onClose={handleCloseEmailDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Email Report to User</DialogTitle>
        <DialogContent>
          {loadingUsers ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select a user to send the Balance Sheet report via email.
              </Typography>
              <Autocomplete
                options={users}
                getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.email})`}
                value={selectedUser}
                onChange={(_, newValue) => setSelectedUser(newValue)}
                renderInput={(params) => <TextField {...params} label="Select User" margin="normal" fullWidth />}
                disabled={sendingEmail}
              />
              {successMessage && <Alert severity="success" sx={{ mt: 2 }}>{successMessage}</Alert>}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmailDialog} disabled={sendingEmail}>Cancel</Button>
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

export default BalanceSheet;