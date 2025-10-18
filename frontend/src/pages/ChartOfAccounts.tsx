import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Autocomplete,
  Link,
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
  Edit,
  Add,
  Block,
} from '@mui/icons-material';
import Header from '../components/Header';
import type { User } from '../types/auth';
import { accountsService, type AccountData, type CreateAccountRequest, type UpdateAccountRequest } from '../services/accountsService';

interface ChartOfAccountsProps {
  user: User;
  onLogout: () => void;
}

const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [minBalance, setMinBalance] = useState<string>('');
  const [maxBalance, setMaxBalance] = useState<string>('');

  // Check if user is admin
  const isAdmin = user.role === 'Administrator';

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Create dialog state
  const [createDialog, setCreateDialog] = useState<{
    open: boolean;
    data: CreateAccountRequest;
    loading: boolean;
  }>({
    open: false,
    data: {
      account_number: '',
      account_name: '',
      account_description: '',
      normal_side: 'Debit',
      category: 'Asset',
      subcategory: '',
      initial_balance: '0.00',
      display_order: undefined,
      statement_type: '',
      comment: '',
    },
    loading: false,
  });

  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    account: AccountData | null;
    data: UpdateAccountRequest;
    loading: boolean;
  }>({
    open: false,
    account: null,
    data: {},
    loading: false,
  });

  // Deactivate dialog state
  const [deactivateDialog, setDeactivateDialog] = useState<{
    open: boolean;
    account: AccountData | null;
    loading: boolean;
  }>({
    open: false,
    account: null,
    loading: false,
  });

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const accountsData = await accountsService.getAllAccounts();
      setAccounts(accountsData);
    } catch (err: any) {
      console.error('Failed to fetch accounts:', err);
      setError(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Get unique subcategories from existing accounts
  const existingSubcategories = useMemo(() => {
    const subcategories = accounts
      .map(account => account.subcategory)
      .filter((subcategory): subcategory is string => !!subcategory && subcategory.trim() !== '');
    return Array.from(new Set(subcategories)).sort();
  }, [accounts]);

  // Standard categories plus any custom ones from existing accounts
  const categoryOptions = useMemo(() => {
    const standardCategories = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
    const existingCategories = accounts.map(account => account.category);
    const allCategories = Array.from(new Set([...standardCategories, ...existingCategories]));
    return allCategories.sort();
  }, [accounts]);

  // Filter accounts based on search and balance range
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        account.account_number.toLowerCase().includes(searchLower) ||
        account.account_name.toLowerCase().includes(searchLower) ||
        account.category.toLowerCase().includes(searchLower) ||
        (account.subcategory && account.subcategory.toLowerCase().includes(searchLower)) ||
        (account.comment && account.comment.toLowerCase().includes(searchLower));

      // Balance range filter
      const balance = parseFloat(account.initial_balance);
      const min = minBalance ? parseFloat(minBalance) : -Infinity;
      const max = maxBalance ? parseFloat(maxBalance) : Infinity;
      const matchesBalance = balance >= min && balance <= max;

      return matchesSearch && matchesBalance;
    });
  }, [accounts, searchQuery, minBalance, maxBalance]);

  // Create handlers
  const handleCreate = () => {
    setCreateDialog({
      open: true,
      data: {
        account_number: '',
        account_name: '',
        account_description: '',
        normal_side: 'Debit',
        category: 'Asset',
        subcategory: '',
        initial_balance: '0.00',
        display_order: undefined,
        statement_type: '',
        comment: '',
      },
      loading: false,
    });
  };

  const handleCreateSubmit = async () => {
    try {
      setCreateDialog((prev) => ({ ...prev, loading: true }));
      await accountsService.createAccount(createDialog.data);
      setSnackbar({
        open: true,
        message: 'Account created successfully',
        severity: 'success',
      });
      setCreateDialog({ open: false, data: {} as CreateAccountRequest, loading: false });
      fetchAccounts();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to create account',
        severity: 'error',
      });
      setCreateDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Edit handlers
  const handleEdit = (account: AccountData) => {
    setEditDialog({
      open: true,
      account: account,
      data: {
        account_number: account.account_number,
        account_name: account.account_name,
        account_description: account.account_description,
        normal_side: account.normal_side,
        category: account.category,
        subcategory: account.subcategory,
        initial_balance: account.initial_balance,
        display_order: account.display_order,
        statement_type: account.statement_type,
        comment: account.comment,
      },
      loading: false,
    });
  };

  const handleEditSubmit = async () => {
    if (!editDialog.account) return;

    try {
      setEditDialog((prev) => ({ ...prev, loading: true }));
      await accountsService.updateAccount(editDialog.account.account_id, editDialog.data);
      setSnackbar({
        open: true,
        message: 'Account updated successfully',
        severity: 'success',
      });
      setEditDialog({ open: false, account: null, data: {}, loading: false });
      fetchAccounts();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to update account',
        severity: 'error',
      });
      setEditDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Deactivate handlers
  const handleDeactivate = (account: AccountData) => {
    setDeactivateDialog({
      open: true,
      account: account,
      loading: false,
    });
  };

  const handleDeactivateSubmit = async () => {
    if (!deactivateDialog.account) return;

    try {
      setDeactivateDialog((prev) => ({ ...prev, loading: true }));
      await accountsService.deactivateAccount(deactivateDialog.account.account_id);
      setSnackbar({
        open: true,
        message: 'Account deactivated successfully',
        severity: 'success',
      });
      setDeactivateDialog({ open: false, account: null, loading: false });
      fetchAccounts();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to deactivate account',
        severity: 'error',
      });
      setDeactivateDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Asset':
        return 'primary';
      case 'Liability':
        return 'error';
      case 'Equity':
        return 'secondary';
      case 'Revenue':
        return 'success';
      case 'Expense':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'account_number',
      headerName: 'Account Number',
      width: 140,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        const account = params.row as AccountData;
        return (
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate(`/account-ledger/${account.account_id}`)}
            sx={{
              cursor: 'pointer',
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {params.value}
          </Link>
        );
      },
    },
    {
      field: 'account_name',
      headerName: 'Account Name',
      width: 200,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        const account = params.row as AccountData;
        return (
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate(`/account-ledger/${account.account_id}`)}
            sx={{
              cursor: 'pointer',
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {params.value}
          </Link>
        );
      },
    },
    {
      field: 'category',
      headerName: 'Type',
      width: 120,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          color={getCategoryColor(params.value) as any}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'subcategory',
      headerName: 'Sub-Type',
      width: 150,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return params.value || 'N/A';
      },
    },
    {
      field: 'initial_balance',
      headerName: 'Balance',
      width: 130,
      sortable: true,
      filterable: true,
      align: 'right',
      renderCell: (params: GridRenderCellParams) => {
        return formatCurrency(params.value);
      },
    },
    {
      field: 'normal_side',
      headerName: 'Normal Side',
      width: 120,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          color={params.value === 'Debit' ? 'info' : 'success'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'is_active',
      headerName: 'Active',
      width: 100,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'error'}
          size="small"
        />
      ),
    },
    {
      field: 'created_by_username',
      headerName: 'Created By',
      width: 130,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return params.value || 'N/A';
      },
    },
    {
      field: 'date_created',
      headerName: 'Date Created',
      width: 120,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return new Date(params.value).toLocaleDateString();
      },
    },
    {
      field: 'comment',
      headerName: 'Comment',
      width: 150,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return params.value || 'N/A';
      },
    },
    ...(isAdmin ? [{
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params: GridRenderCellParams) => {
        const account = params.row as AccountData;
        const isInactive = !account.is_active;
        
        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
            <Tooltip title="Edit Account">
              <IconButton
                size="small"
                onClick={() => handleEdit(account)}
                sx={{ 
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.light', color: 'white' }
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Deactivate Account">
              <IconButton
                size="small"
                onClick={() => handleDeactivate(account)}
                disabled={isInactive}
                sx={{ 
                  color: 'error.main',
                  '&:hover': { backgroundColor: 'error.light', color: 'white' },
                  '&:disabled': { color: 'grey.400' }
                }}
              >
                <Block fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    }] : []),
  ], [isAdmin, navigate]);

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', width: '100%' }}>
      <Header user={user} onLogout={onLogout} />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pt: 10 }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              Chart of Accounts
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Manage company accounts and financial categories
            </Typography>
          </Box>
          {isAdmin && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={handleCreate}
            >
              Create Account
            </Button>
          )}
        </Box>

        {/* Search and Filter Bar */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Search accounts"
                variant="outlined"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by number, name, type, or comment..."
              />
            </Box>
            <Box sx={{ flex: '1 1 200px' }}>
              <TextField
                fullWidth
                label="Min Balance"
                variant="outlined"
                type="number"
                value={minBalance}
                onChange={(e) => setMinBalance(e.target.value)}
                placeholder="0.00"
              />
            </Box>
            <Box sx={{ flex: '1 1 200px' }}>
              <TextField
                fullWidth
                label="Max Balance"
                variant="outlined"
                type="number"
                value={maxBalance}
                onChange={(e) => setMaxBalance(e.target.value)}
                placeholder="999999.99"
              />
            </Box>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Accounts Table */}
        <Box sx={{ height: 600, width: '100%' }}>
          {loading && !accounts.length ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredAccounts}
              columns={columns}
              getRowId={(row) => row.account_id}
              slots={{
                toolbar: GridToolbar,
              }}
              pageSizeOptions={[5, 10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 10,
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
        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            label={`Total Accounts: ${filteredAccounts.length}`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`Active: ${filteredAccounts.filter(a => a.is_active).length}`} 
            color="success" 
            variant="outlined"
          />
          <Chip 
            label={`Inactive: ${filteredAccounts.filter(a => !a.is_active).length}`} 
            color="error" 
            variant="outlined"
          />
          <Chip 
            label={`Assets: ${filteredAccounts.filter(a => a.category === 'Asset').length}`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`Liabilities: ${filteredAccounts.filter(a => a.category === 'Liability').length}`} 
            color="error" 
            variant="outlined"
          />
          <Chip 
            label={`Equity: ${filteredAccounts.filter(a => a.category === 'Equity').length}`} 
            color="secondary" 
            variant="outlined"
          />
        </Box>
      </Container>

      {/* Create Account Dialog */}
      <Dialog 
        open={createDialog.open} 
        onClose={() => !createDialog.loading && setCreateDialog({ ...createDialog, open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Account</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Account Number"
                value={createDialog.data.account_number}
                onChange={(e) => setCreateDialog((prev) => ({ 
                  ...prev, 
                  data: { ...prev.data, account_number: e.target.value } 
                }))}
                fullWidth
                required
              />
              <TextField
                label="Account Name"
                value={createDialog.data.account_name}
                onChange={(e) => setCreateDialog((prev) => ({ 
                  ...prev, 
                  data: { ...prev.data, account_name: e.target.value } 
                }))}
                fullWidth
                required
              />
            </Box>
            <TextField
              label="Description"
              value={createDialog.data.account_description}
              onChange={(e) => setCreateDialog((prev) => ({ 
                ...prev, 
                data: { ...prev.data, account_description: e.target.value } 
              }))}
              fullWidth
              multiline
              rows={2}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Autocomplete
                freeSolo
                options={categoryOptions}
                value={createDialog.data.category}
                onChange={(_event, newValue) => {
                  setCreateDialog((prev) => ({ 
                    ...prev, 
                    data: { ...prev.data, category: newValue as any || 'Asset' } 
                  }));
                }}
                onInputChange={(_event, newInputValue) => {
                  if (newInputValue) {
                    setCreateDialog((prev) => ({ 
                      ...prev, 
                      data: { ...prev.data, category: newInputValue as any } 
                    }));
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Category"
                    required
                  />
                )}
                fullWidth
                sx={{ flex: 1 }}
              />
              <TextField
                label="Normal Side"
                select
                value={createDialog.data.normal_side}
                onChange={(e) => setCreateDialog((prev) => ({ 
                  ...prev, 
                  data: { ...prev.data, normal_side: e.target.value as any } 
                }))}
                fullWidth
                required
                sx={{ flex: 1 }}
              >
                <MenuItem value="Debit">Debit</MenuItem>
                <MenuItem value="Credit">Credit</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Autocomplete
                freeSolo
                options={existingSubcategories}
                value={createDialog.data.subcategory || ''}
                onChange={(_event, newValue) => {
                  setCreateDialog((prev) => ({ 
                    ...prev, 
                    data: { ...prev.data, subcategory: newValue || '' } 
                  }));
                }}
                onInputChange={(_event, newInputValue) => {
                  setCreateDialog((prev) => ({ 
                    ...prev, 
                    data: { ...prev.data, subcategory: newInputValue } 
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Subcategory"
                  />
                )}
                fullWidth
                sx={{ flex: 1 }}
              />
              <TextField
                label="Initial Balance"
                type="number"
                value={createDialog.data.initial_balance}
                onChange={(e) => setCreateDialog((prev) => ({ 
                  ...prev, 
                  data: { ...prev.data, initial_balance: e.target.value } 
                }))}
                fullWidth
                inputProps={{ step: '0.01' }}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Display Order"
                type="number"
                value={createDialog.data.display_order || ''}
                onChange={(e) => setCreateDialog((prev) => ({ 
                  ...prev, 
                  data: { ...prev.data, display_order: e.target.value ? parseInt(e.target.value) : undefined } 
                }))}
                fullWidth
              />
              <TextField
                label="Statement Type"
                select
                value={createDialog.data.statement_type}
                onChange={(e) => setCreateDialog((prev) => ({ 
                  ...prev, 
                  data: { ...prev.data, statement_type: e.target.value } 
                }))}
                fullWidth
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="Income Statement">Income Statement</MenuItem>
                <MenuItem value="Balance Sheet">Balance Sheet</MenuItem>
                <MenuItem value="Retained Earnings Statement">Retained Earnings Statement</MenuItem>
              </TextField>
            </Box>
            <TextField
              label="Comment"
              value={createDialog.data.comment}
              onChange={(e) => setCreateDialog((prev) => ({ 
                ...prev, 
                data: { ...prev.data, comment: e.target.value } 
              }))}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCreateDialog({ ...createDialog, open: false })} 
            disabled={createDialog.loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateSubmit} 
            variant="contained" 
            disabled={createDialog.loading || !createDialog.data.account_number || !createDialog.data.account_name}
          >
            {createDialog.loading ? <CircularProgress size={24} /> : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog 
        open={editDialog.open} 
        onClose={() => !editDialog.loading && setEditDialog({ open: false, account: null, data: {}, loading: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Account</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Account Number"
                value={editDialog.data.account_number || ''}
                onChange={(e) => setEditDialog((prev) => ({ 
                  ...prev, 
                  data: { ...prev.data, account_number: e.target.value } 
                }))}
                fullWidth
              />
              <TextField
                label="Account Name"
                value={editDialog.data.account_name || ''}
                onChange={(e) => setEditDialog((prev) => ({ 
                  ...prev, 
                  data: { ...prev.data, account_name: e.target.value } 
                }))}
                fullWidth
              />
            </Box>
            <TextField
              label="Description"
              value={editDialog.data.account_description || ''}
              onChange={(e) => setEditDialog((prev) => ({ 
                ...prev, 
                data: { ...prev.data, account_description: e.target.value } 
              }))}
              fullWidth
              multiline
              rows={2}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Autocomplete
                freeSolo
                options={categoryOptions}
                value={editDialog.data.category || ''}
                onChange={(_event, newValue) => {
                  setEditDialog((prev) => ({ 
                    ...prev, 
                    data: { ...prev.data, category: newValue as any || '' } 
                  }));
                }}
                onInputChange={(_event, newInputValue) => {
                  if (newInputValue) {
                    setEditDialog((prev) => ({ 
                      ...prev, 
                      data: { ...prev.data, category: newInputValue as any } 
                    }));
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Category"
                  />
                )}
                fullWidth
                sx={{ flex: 1 }}
              />
              <TextField
                label="Normal Side"
                select
                value={editDialog.data.normal_side || ''}
                onChange={(e) => setEditDialog((prev) => ({ 
                  ...prev, 
                  data: { ...prev.data, normal_side: e.target.value as any } 
                }))}
                fullWidth
                sx={{ flex: 1 }}
              >
                <MenuItem value="Debit">Debit</MenuItem>
                <MenuItem value="Credit">Credit</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Autocomplete
                freeSolo
                options={existingSubcategories}
                value={editDialog.data.subcategory || ''}
                onChange={(_event, newValue) => {
                  setEditDialog((prev) => ({ 
                    ...prev, 
                    data: { ...prev.data, subcategory: newValue || '' } 
                  }));
                }}
                onInputChange={(_event, newInputValue) => {
                  setEditDialog((prev) => ({ 
                    ...prev, 
                    data: { ...prev.data, subcategory: newInputValue } 
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Subcategory"
                  />
                )}
                fullWidth
                sx={{ flex: 1 }}
              />
              <TextField
                label="Initial Balance"
                type="number"
                value={editDialog.data.initial_balance || ''}
                onChange={(e) => setEditDialog((prev) => ({ 
                  ...prev, 
                  data: { ...prev.data, initial_balance: e.target.value } 
                }))}
                fullWidth
                inputProps={{ step: '0.01' }}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Display Order"
                type="number"
                value={editDialog.data.display_order || ''}
                onChange={(e) => setEditDialog((prev) => ({ 
                  ...prev, 
                  data: { ...prev.data, display_order: e.target.value ? parseInt(e.target.value) : undefined } 
                }))}
                fullWidth
              />
              <TextField
                label="Statement Type"
                select
                value={editDialog.data.statement_type || ''}
                onChange={(e) => setEditDialog((prev) => ({ 
                  ...prev, 
                  data: { ...prev.data, statement_type: e.target.value } 
                }))}
                fullWidth
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="Income Statement">Income Statement</MenuItem>
                <MenuItem value="Balance Sheet">Balance Sheet</MenuItem>
                <MenuItem value="Retained Earnings Statement">Retained Earnings Statement</MenuItem>
              </TextField>
            </Box>
            <TextField
              label="Comment"
              value={editDialog.data.comment || ''}
              onChange={(e) => setEditDialog((prev) => ({ 
                ...prev, 
                data: { ...prev.data, comment: e.target.value } 
              }))}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setEditDialog({ open: false, account: null, data: {}, loading: false })} 
            disabled={editDialog.loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleEditSubmit} 
            variant="contained" 
            disabled={editDialog.loading}
          >
            {editDialog.loading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate Account Dialog */}
      <Dialog 
        open={deactivateDialog.open} 
        onClose={() => !deactivateDialog.loading && setDeactivateDialog({ open: false, account: null, loading: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Deactivate Account</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 2 }}>
            Are you sure you want to deactivate account <strong>{deactivateDialog.account?.account_number} - {deactivateDialog.account?.account_name}</strong>?
          </Typography>
          <Typography sx={{ mt: 2, color: 'warning.main' }}>
            This will mark the account as inactive but will not delete it. This action can be reversed by editing the account.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeactivateDialog({ open: false, account: null, loading: false })} 
            disabled={deactivateDialog.loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeactivateSubmit} 
            variant="contained" 
            color="error"
            disabled={deactivateDialog.loading}
          >
            {deactivateDialog.loading ? <CircularProgress size={24} /> : 'Deactivate Account'}
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

export default ChartOfAccounts;
