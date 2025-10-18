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
} from '@mui/icons-material';
import Header from '../components/Header';
import type { User } from '../types/auth';
import { accountsService, type AccountData, type LedgerEntry } from '../services/accountsService';

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
    return new Date(dateString).toLocaleDateString();
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
              getRowId={(row) => row.ledger_id || `opening-${row.post_ref}`}
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
    </Box>
  );
};

export default AccountLedger;
