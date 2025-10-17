import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Snackbar,
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
  Email,
} from '@mui/icons-material';
import Header from '../components/Header';
import type { User } from '../types/auth';
import { profileService, type PasswordExpiryData } from '../services/profileService';

interface PasswordExpiryProps {
  user: User;
  onLogout: () => void;
}

const PasswordExpiry: React.FC<PasswordExpiryProps> = ({ user, onLogout }) => {
  const [passwordData, setPasswordData] = useState<PasswordExpiryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'success' });

  // Fetch password expiry data
  useEffect(() => {
    const fetchPasswordData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await profileService.getPasswordExpiry();
        setPasswordData(data);
      } catch (err: any) {
        console.error('Error fetching password expiry data:', err);
        setError(err.response?.data?.detail || 'Failed to load password expiry data');
      } finally {
        setLoading(false);
      }
    };

    fetchPasswordData();
  }, []);

  const handleSendReminder = async (userId: string, email: string, daysUntilExpiry: number | null) => {
    try {
      if (daysUntilExpiry === null) {
        setSnackbar({
          open: true,
          message: 'Cannot send reminder: No password expiry date available',
          severity: 'error',
        });
        return;
      }

      await profileService.sendPasswordExpiryReminder(userId, daysUntilExpiry);
      setSnackbar({
        open: true,
        message: `Password expiry reminder sent successfully to ${email}`,
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Error sending reminder:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Failed to send password expiry reminder',
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired':
        return 'error';
      case 'expiring_soon':
        return 'warning';
      case 'normal':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'expired':
        return 'Expired';
      case 'expiring_soon':
        return 'Expiring Soon';
      case 'normal':
        return 'Normal';
      case 'no_password':
        return 'No Password';
      default:
        return 'Unknown';
    }
  };

  const getRoleColor = (role: string) => {
    const normalizedRole = role.toLowerCase();
    switch (normalizedRole) {
      case 'administrator':
      case 'admin':
        return 'error';
      case 'manager':
        return 'primary';
      case 'accountant':
        return 'secondary';
      case 'user':
        return 'info';
      default:
        return 'default';
    }
  };

  const getDaysUntilExpiryDisplay = (days: number) => {
    if (days < 0) {
      return `Expired ${Math.abs(days)} days ago`;
    } else if (days === 0) {
      return 'Expires today';
    } else {
      return `${days} days`;
    }
  };

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'user_id',
      headerName: 'User ID',
      width: 100,
      sortable: true,
      filterable: true,
      valueGetter: (params: any) => params.row?.user_id ? params.row.user_id.substring(0, 8) : '',
    },
    {
      field: 'username',
      headerName: 'Username',
      width: 140,
      sortable: true,
      filterable: true,
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 160,
      sortable: true,
      filterable: true,
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 260,
      sortable: true,
      filterable: true,
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 130,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value.charAt(0).toUpperCase() + params.value.slice(1)}
          color={getRoleColor(params.value) as any}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'password_expiry_date',
      headerName: 'Password Expiry Date',
      width: 190,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        if (!params.value) {
          return <Typography variant="body2" color="text.secondary">N/A</Typography>;
        }
        return new Date(params.value).toLocaleDateString();
      },
    },
    {
      field: 'days_until_expiry',
      headerName: 'Days Until Expiry',
      width: 200,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        const days = params.value as number | null;
        if (days === null) {
          return <Typography variant="body2" color="text.secondary">N/A</Typography>;
        }
        return (
          <Typography
            variant="body2"
            sx={{
              color: days < 0 ? 'error.main' : days <= 7 ? 'warning.main' : 'text.primary',
              fontWeight: days <= 7 ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              height: '100%',
            }}
          >
            {getDaysUntilExpiryDisplay(days)}
          </Typography>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={getStatusLabel(params.value)}
          color={getStatusColor(params.value) as any}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params: GridRenderCellParams) => {
        const passwordData = params.row as PasswordExpiryData;
        
        return (
          <Box sx={{ 
            display: 'flex', 
            gap: 0.5,
            alignItems: 'center',
            height: '100%',
          }}>
            <Tooltip title="Send Reminder">
              <IconButton
                size="small"
                onClick={() => handleSendReminder(passwordData.user_id, passwordData.email, passwordData.days_until_expiry)}
                sx={{ 
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.light', color: 'white' }
                }}
              >
                <Email fontSize="small" />
              </IconButton>
            </Tooltip>
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              Password Expiry Management
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Monitor and manage user password expiration dates
            </Typography>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Password Expiry Table */}
        {!loading && !error && (
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={passwordData}
              columns={columns}
              slots={{
                toolbar: GridToolbar,
              }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { debounceMs: 500 },
                },
              }}
              pageSizeOptions={[5, 10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 10,
                  },
                },
                sorting: {
                  sortModel: [
                    {
                      field: 'days_until_expiry',
                      sort: 'asc',
                    },
                  ],
                },
              }}
              disableRowSelectionOnClick
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
          </Box>
        )}

        {/* Summary Section */}
        {!loading && !error && (
          <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`Total Users: ${passwordData.length}`} 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              label={`Expired: ${passwordData.filter(p => p.status === 'expired').length}`} 
              color="error" 
              variant="outlined"
            />
            <Chip 
              label={`Expiring Soon: ${passwordData.filter(p => p.status === 'expiring_soon').length}`} 
              color="warning" 
              variant="outlined"
            />
            <Chip 
              label={`Normal: ${passwordData.filter(p => p.status === 'normal').length}`} 
              color="success" 
              variant="outlined"
            />
          </Box>
        )}
      </Container>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PasswordExpiry;