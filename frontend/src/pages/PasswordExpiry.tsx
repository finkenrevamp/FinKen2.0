import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Chip,
  IconButton,
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
  Email,
} from '@mui/icons-material';
import Header from '../components/Header';
import type { User } from '../types/auth';

interface PasswordExpiryProps {
  user: User;
  onLogout: () => void;
}

interface PasswordExpiryData {
  id: string;
  userId: string;
  username: string;
  name: string;
  email: string;
  role: string;
  passwordExpiryDate: string;
  daysUntilExpiry: number;
  status: 'expired' | 'expiring_soon' | 'normal';
}

const PasswordExpiry: React.FC<PasswordExpiryProps> = ({ user, onLogout }) => {
  // Mock data for demonstration - in real app this would come from API
  const [passwordData] = useState<PasswordExpiryData[]>([
    {
      id: '1',
      userId: 'USR001',
      username: 'mjohnson',
      name: 'Michael Johnson',
      email: 'michael.johnson@example.com',
      role: 'User',
      passwordExpiryDate: '2024-10-20',
      daysUntilExpiry: 6,
      status: 'expiring_soon',
    },
    {
      id: '2',
      userId: 'USR002',
      username: 'swilliams',
      name: 'Sarah Williams',
      email: 'sarah.williams@example.com',
      role: 'Manager',
      passwordExpiryDate: '2024-10-12',
      daysUntilExpiry: -2,
      status: 'expired',
    },
    {
      id: '3',
      userId: 'USR003',
      username: 'dmiller',
      name: 'David Miller',
      email: 'david.miller@example.com',
      role: 'Admin',
      passwordExpiryDate: '2024-11-15',
      daysUntilExpiry: 32,
      status: 'normal',
    },
    {
      id: '4',
      userId: 'USR004',
      username: 'erodriguez',
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@example.com',
      role: 'User',
      passwordExpiryDate: '2024-10-18',
      daysUntilExpiry: 4,
      status: 'expiring_soon',
    },
    {
      id: '5',
      userId: 'USR005',
      username: 'jthompson',
      name: 'James Thompson',
      email: 'james.thompson@example.com',
      role: 'Manager',
      passwordExpiryDate: '2024-12-01',
      daysUntilExpiry: 48,
      status: 'normal',
    },
    {
      id: '6',
      userId: 'USR006',
      username: 'landerson',
      name: 'Lisa Anderson',
      email: 'lisa.anderson@example.com',
      role: 'User',
      passwordExpiryDate: '2024-10-10',
      daysUntilExpiry: -4,
      status: 'expired',
    },
    {
      id: '7',
      userId: 'USR007',
      username: 'rbrown',
      name: 'Robert Brown',
      email: 'robert.brown@example.com',
      role: 'User',
      passwordExpiryDate: '2024-10-22',
      daysUntilExpiry: 8,
      status: 'expiring_soon',
    },
    {
      id: '8',
      userId: 'USR008',
      username: 'kwilson',
      name: 'Karen Wilson',
      email: 'karen.wilson@example.com',
      role: 'Admin',
      passwordExpiryDate: '2024-11-30',
      daysUntilExpiry: 47,
      status: 'normal',
    },
  ]);

  const handleSendReminder = (userId: string, email: string) => {
    console.log('Send reminder to user:', userId, email);
    // TODO: Implement send reminder functionality
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
      field: 'userId',
      headerName: 'User ID',
      width: 100,
      sortable: true,
      filterable: true,
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
      field: 'passwordExpiryDate',
      headerName: 'Password Expiry Date',
      width: 190,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return new Date(params.value).toLocaleDateString();
      },
    },
    {
      field: 'daysUntilExpiry',
      headerName: 'Days Until Expiry',
      width: 200,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        const days = params.value as number;
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
                onClick={() => handleSendReminder(passwordData.userId, passwordData.email)}
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

        {/* Password Expiry Table */}
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
                    field: 'daysUntilExpiry',
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

        {/* Summary Section */}
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
      </Container>
    </Box>
  );
};

export default PasswordExpiry;