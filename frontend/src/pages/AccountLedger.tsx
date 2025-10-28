import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  DataGrid,
  GridToolbar,
} from '@mui/x-data-grid';
import type {
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import {
  ArrowBack,
  Email,
} from '@mui/icons-material';
import Header from '../components/Header';
import type { User } from '../types/auth';
import { accountsService, type AccountData, type LedgerEntry } from '../services/accountsService';
import { profileService, type UserData } from '../services/profileService';

interface AccountLedgerProps {
  user: User;
  onLogout: () => void;
}

const AccountLedger: React.FC<AccountLedgerProps> = ({ user, onLogout }) => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  
  const [account, setAccount] = useState<AccountData | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Email dialog state
  const [emailDialog, setEmailDialog] = useState<{
    open: boolean;
    recipients: UserData[];
    selectedUserId: string;
    subject: string;
    body: string;
    loading: boolean;
    loadingRecipients: boolean;
  }>({
    open: false,
    recipients: [],
    selectedUserId: '',
    subject: '',
    body: '',
    loading: false,
    loadingRecipients: false,
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch account details
  const fetchAccount = useCallback(async () => {
    if (!accountId) return;
    
    try {
      const accountData = await accountsService.getAccount(parseInt(accountId));
      setAccount(accountData);
    } catch (err: any) {
      console.error('Failed to fetch account:', err);
      setError(err.message || 'Failed to load account');
    }
  }, [accountId]);

  // Fetch ledger entries
  const fetchLedger = useCallback(async () => {
    if (!accountId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const filters: { start_date?: string; end_date?: string } = {};
      if (startDate) filters.start_date = startDate;
      if (endDate) filters.end_date = endDate;
      
      const entries = await accountsService.getAccountLedger(parseInt(accountId), filters);
      setLedgerEntries(entries);
    } catch (err: any) {
      console.error('Failed to fetch ledger entries:', err);
      setError(err.message || 'Failed to load ledger entries');
    } finally {
      setLoading(false);
    }
  }, [accountId, startDate, endDate]);

  useEffect(() => {
    fetchAccount();
    fetchLedger();
  }, [fetchAccount, fetchLedger]);

  // Fetch admins and managers for email recipients
  const fetchEmailRecipients = useCallback(async () => {
    try {
      setEmailDialog((prev) => ({ ...prev, loadingRecipients: true }));
      const allUsers = await profileService.getAllUsers();
      // Filter for only active admins and managers
      const recipients = allUsers.filter(
        (u) => u.is_active && !u.is_suspended && 
        (u.role_name === 'Administrator' || u.role_name === 'Manager')
      );
      setEmailDialog((prev) => ({ ...prev, recipients, loadingRecipients: false }));
    } catch (err: any) {
      console.error('Failed to fetch email recipients:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Failed to load email recipients',
        severity: 'error',
      });
      setEmailDialog((prev) => ({ ...prev, loadingRecipients: false }));
    }
  }, []);

  // Email handlers
  const handleOpenEmailDialog = () => {
    setEmailDialog({
      open: true,
      recipients: [],
      selectedUserId: '',
      subject: '',
      body: '',
      loading: false,
      loadingRecipients: false,
    });
    fetchEmailRecipients();
  };

  const handleEmailSubmit = async () => {
    if (!emailDialog.selectedUserId) return;

    try {
      setEmailDialog((prev) => ({ ...prev, loading: true }));
      await profileService.sendEmailToUser(emailDialog.selectedUserId, {
        subject: emailDialog.subject,
        body: emailDialog.body,
      });
      setSnackbar({
        open: true,
        message: 'Email sent successfully',
        severity: 'success',
      });
      setEmailDialog({
        open: false,
        recipients: [],
        selectedUserId: '',
        subject: '',
        body: '',
        loading: false,
        loadingRecipients: false,
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to send email',
        severity: 'error',
      });
      setEmailDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      const searchLower = searchQuery.toLowerCase();
      return !searchQuery || 
        entry.post_ref.toLowerCase().includes(searchLower) ||
        entry.description.toLowerCase().includes(searchLower) ||
        entry.debit.includes(searchQuery) ||
        entry.credit.includes(searchQuery) ||
        entry.balance.includes(searchQuery);
    });
  }, [ledgerEntries, searchQuery]);

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    // Parse date manually to avoid timezone issues
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  // Calculate totals
  const totals = useMemo(() => {
    const totalDebit = filteredEntries.reduce((sum, entry) => 
      sum + parseFloat(entry.debit), 0
    );
    const totalCredit = filteredEntries.reduce((sum, entry) => 
      sum + parseFloat(entry.credit), 0
    );
    const finalBalance = filteredEntries.length > 0 
      ? parseFloat(filteredEntries[filteredEntries.length - 1].balance)
      : 0;
    
    return { totalDebit, totalCredit, finalBalance };
  }, [filteredEntries]);

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'date',
      headerName: 'Date',
      width: 120,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return formatDate(params.value);
      },
    },
    {
      field: 'post_ref',
      headerName: 'Post Ref',
      width: 120,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        const postRef = params.value;
        // Extract journal entry ID from post_ref (e.g., "JE-123" -> 123)
        const jeMatch = postRef.match(/JE-(\d+)/);
        const journalEntryId = jeMatch ? jeMatch[1] : null;
        
        if (journalEntryId) {
          return (
            <Box
              sx={{
                color: 'primary.main',
                cursor: 'pointer',
                textDecoration: 'underline',
                '&:hover': {
                  color: 'primary.dark',
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                navigate('/journalize', { state: { openEntryId: parseInt(journalEntryId) } });
              }}
            >
              {postRef}
            </Box>
          );
        }
        return postRef;
      },
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 200,
      sortable: true,
      filterable: true,
    },
    {
      field: 'debit',
      headerName: 'Debit',
      width: 130,
      sortable: true,
      filterable: true,
      align: 'right',
      renderCell: (params: GridRenderCellParams) => {
        const value = parseFloat(params.value);
        return value > 0 ? formatCurrency(params.value) : '-';
      },
    },
    {
      field: 'credit',
      headerName: 'Credit',
      width: 130,
      sortable: true,
      filterable: true,
      align: 'right',
      renderCell: (params: GridRenderCellParams) => {
        const value = parseFloat(params.value);
        return value > 0 ? formatCurrency(params.value) : '-';
      },
    },
    {
      field: 'balance',
      headerName: 'Balance',
      width: 150,
      sortable: true,
      filterable: true,
      align: 'right',
      renderCell: (params: GridRenderCellParams) => {
        const value = parseFloat(params.value);
        return (
          <Box sx={{ 
            fontWeight: 'bold',
            color: value < 0 ? 'error.main' : 'text.primary'
          }}>
            {formatCurrency(params.value)}
          </Box>
        );
      },
    },
  ], []);

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', width: '100%' }}>
      <Header user={user} onLogout={onLogout} />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pt: 10 }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
          <IconButton onClick={() => navigate('/chart-of-accounts')} sx={{ color: 'primary.main' }}>
            <ArrowBack />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" component="h1" gutterBottom>
              Account Ledger
            </Typography>
            {account && (
              <Typography variant="h6" color="text.secondary">
                {account.account_number} - {account.account_name}
              </Typography>
            )}
          </Box>
          <Tooltip title="Email Admin/Manager">
            <Button
              variant="contained"
              color="primary"
              startIcon={<Email />}
              onClick={handleOpenEmailDialog}
              sx={{ height: 'fit-content' }}
            >
              Email
            </Button>
          </Tooltip>
        </Box>

        {/* Account Info Cards */}
        {account && (
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`Category: ${account.category}`} 
              color="primary" 
              variant="outlined"
            />
            {account.subcategory && (
              <Chip 
                label={`Sub-Type: ${account.subcategory}`} 
                color="secondary" 
                variant="outlined"
              />
            )}
            <Chip 
              label={`Normal Side: ${account.normal_side}`} 
              color={account.normal_side === 'Debit' ? 'info' : 'success'} 
              variant="outlined"
            />
            <Chip 
              label={account.is_active ? 'Active' : 'Inactive'} 
              color={account.is_active ? 'success' : 'error'}
            />
          </Box>
        )}

        {/* Search and Filter Bar */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Search entries"
                variant="outlined"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by description, post ref, or amount..."
              />
            </Box>
            <Box sx={{ flex: '1 1 200px' }}>
              <TextField
                fullWidth
                label="Start Date"
                variant="outlined"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Box sx={{ flex: '1 1 200px' }}>
              <TextField
                fullWidth
                label="End Date"
                variant="outlined"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button 
                variant="contained" 
                onClick={fetchLedger}
                disabled={loading}
              >
                Apply Filters
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Ledger Table */}
        <Box sx={{ height: 600, width: '100%' }}>
          {loading && !ledgerEntries.length ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredEntries}
              columns={columns}
              getRowId={(row) => row.ledger_id}
              slots={{
                toolbar: GridToolbar,
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 25,
                  },
                },
              }}
              disableRowSelectionOnClick
              loading={loading}
              sx={{
                '& .MuiDataGrid-root': {
                  border: 'none',
                },
                '& .MuiDataGrid-main': {
                  '& .MuiDataGrid-columnHeaders': {
                    borderBottom: 'none',
                    backgroundColor: 'grey.50',
                  },
                  '& .MuiDataGrid-cell': {
                    borderBottom: '1px solid #f0f0f0',
                    '&:hover': {
                      backgroundColor: 'grey.50',
                    },
                  },
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: 'none',
                  backgroundColor: 'grey.50',
                },
              }}
            />
          )}
        </Box>

        {/* Summary Section */}
        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Chip 
            label={`Total Entries: ${filteredEntries.length}`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`Total Debits: ${formatCurrency(totals.totalDebit.toString())}`} 
            color="info" 
            variant="outlined"
          />
          <Chip 
            label={`Total Credits: ${formatCurrency(totals.totalCredit.toString())}`} 
            color="success" 
            variant="outlined"
          />
          <Chip 
            label={`Final Balance: ${formatCurrency(totals.finalBalance.toString())}`} 
            color="secondary" 
            variant="filled"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
      </Container>

      {/* Email Dialog */}
      <Dialog 
        open={emailDialog.open} 
        onClose={() => !emailDialog.loading && setEmailDialog({
          open: false,
          recipients: [],
          selectedUserId: '',
          subject: '',
          body: '',
          loading: false,
          loadingRecipients: false,
        })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Email Admin or Manager</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Recipient"
              select
              value={emailDialog.selectedUserId}
              onChange={(e) => setEmailDialog((prev) => ({ ...prev, selectedUserId: e.target.value }))}
              fullWidth
              required
              disabled={emailDialog.loadingRecipients}
              helperText={emailDialog.loadingRecipients ? 'Loading recipients...' : 'Select an admin or manager to email'}
            >
              {emailDialog.recipients.length === 0 && !emailDialog.loadingRecipients && (
                <MenuItem value="" disabled>
                  No admins or managers available
                </MenuItem>
              )}
              {emailDialog.recipients.map((recipient) => (
                <MenuItem key={recipient.id} value={recipient.id}>
                  {recipient.first_name} {recipient.last_name} ({recipient.role_name}) - {recipient.email}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Subject"
              value={emailDialog.subject}
              onChange={(e) => setEmailDialog((prev) => ({ ...prev, subject: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Message"
              value={emailDialog.body}
              onChange={(e) => setEmailDialog((prev) => ({ ...prev, body: e.target.value }))}
              fullWidth
              multiline
              rows={6}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setEmailDialog({
              open: false,
              recipients: [],
              selectedUserId: '',
              subject: '',
              body: '',
              loading: false,
              loadingRecipients: false,
            })} 
            disabled={emailDialog.loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleEmailSubmit} 
            variant="contained" 
            disabled={emailDialog.loading || !emailDialog.selectedUserId || !emailDialog.subject || !emailDialog.body}
          >
            {emailDialog.loading ? <CircularProgress size={24} /> : 'Send Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AccountLedger;
