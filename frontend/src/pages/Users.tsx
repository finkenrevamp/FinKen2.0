import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
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
  Edit,
  Email,
  PauseCircle,
  Block,
  PersonAdd,
} from '@mui/icons-material';
import Header from '../components/Header';
import type { User } from '../types/auth';

interface UsersProps {
  user: User;
  onLogout: () => void;
}

interface UserData {
  id: string;
  userId: string;
  username: string;
  name: string;
  email: string;
  dateOfBirth: string;
  address: string;
  role: string;
  status: 'active' | 'suspended' | 'deactivated' | 'pending';
  dateCreated: string;
}

const Users: React.FC<UsersProps> = ({ user, onLogout }) => {
  // Mock data for demonstration - in real app this would come from API
  const [users] = useState<UserData[]>([
    {
      id: '1',
      userId: 'USR001',
      username: 'john.doe',
      name: 'John Doe',
      email: 'john.doe@example.com',
      dateOfBirth: '1985-03-15',
      address: '123 Main St, New York, NY 10001',
      role: 'accountant',
      status: 'active',
      dateCreated: '2024-01-15',
    },
    {
      id: '2',
      userId: 'USR002',
      username: 'jane.smith',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      dateOfBirth: '1990-07-22',
      address: '456 Oak Ave, Los Angeles, CA 90210',
      role: 'manager',
      status: 'active',
      dateCreated: '2024-02-10',
    },
    {
      id: '3',
      userId: 'USR003',
      username: 'bob.wilson',
      name: 'Bob Wilson',
      email: 'bob.wilson@example.com',
      dateOfBirth: '1982-11-08',
      address: '789 Pine St, Chicago, IL 60601',
      role: 'administrator',
      status: 'suspended',
      dateCreated: '2024-01-20',
    },
    {
      id: '4',
      userId: 'USR004',
      username: 'alice.brown',
      name: 'Alice Brown',
      email: 'alice.brown@example.com',
      dateOfBirth: '1988-04-12',
      address: '321 Elm St, Houston, TX 77001',
      role: 'accountant',
      status: 'pending',
      dateCreated: '2024-03-01',
    },
    {
      id: '5',
      userId: 'USR005',
      username: 'charlie.davis',
      name: 'Charlie Davis',
      email: 'charlie.davis@example.com',
      dateOfBirth: '1975-09-30',
      address: '654 Maple Ave, Phoenix, AZ 85001',
      role: 'manager',
      status: 'deactivated',
      dateCreated: '2023-12-15',
    },
  ]);

  const handleEdit = (userId: string) => {
    console.log('Edit user:', userId);
    // TODO: Implement edit functionality
  };

  const handleEmail = (userId: string) => {
    console.log('Email user:', userId);
    // TODO: Implement email functionality
  };

  const handleSuspend = (userId: string) => {
    console.log('Suspend user:', userId);
    // TODO: Implement suspend functionality
  };

  const handleDeactivate = (userId: string) => {
    console.log('Deactivate user:', userId);
    // TODO: Implement deactivate functionality
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'warning';
      case 'deactivated':
        return 'error';
      case 'pending':
        return 'info';
      default:
        return 'default';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'error';
      case 'manager':
        return 'primary';
      case 'accountant':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'userId',
      headerName: 'User ID',
      width: 75,
      sortable: true,
      filterable: true,
    },
    {
      field: 'username',
      headerName: 'Username',
      width: 150,
      sortable: true,
      filterable: true,
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 140,
      sortable: true,
      filterable: true,
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 210,
      sortable: true,
      filterable: true,
    },
    {
      field: 'dateOfBirth',
      headerName: 'Date of Birth',
      width: 100,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return new Date(params.value).toLocaleDateString();
      },
    },
    {
      field: 'address',
      headerName: 'Address',
      width: 250,
      sortable: true,
      filterable: true,
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 120,
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
      field: 'status',
      headerName: 'Status',
      width: 120,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value.charAt(0).toUpperCase() + params.value.slice(1)}
          color={getStatusColor(params.value) as any}
          size="small"
        />
      ),
    },
    {
      field: 'dateCreated',
      headerName: 'Date Created',
      width: 105,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return new Date(params.value).toLocaleDateString();
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params: GridRenderCellParams) => {
        const userData = params.row as UserData;
        
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Edit User">
              <IconButton
                size="small"
                onClick={() => handleEdit(userData.userId)}
                sx={{ 
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.light', color: 'white' }
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Email User">
              <IconButton
                size="small"
                onClick={() => handleEmail(userData.userId)}
                sx={{ 
                  color: 'info.main',
                  '&:hover': { backgroundColor: 'info.light', color: 'white' }
                }}
              >
                <Email fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Suspend User">
              <IconButton
                size="small"
                onClick={() => handleSuspend(userData.userId)}
                disabled={userData.status === 'suspended' || userData.status === 'deactivated'}
                sx={{ 
                  color: 'warning.main',
                  '&:hover': { backgroundColor: 'warning.light', color: 'white' },
                  '&:disabled': { color: 'grey.400' }
                }}
              >
                <PauseCircle fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Deactivate User">
              <IconButton
                size="small"
                onClick={() => handleDeactivate(userData.userId)}
                disabled={userData.status === 'deactivated'}
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
              User Management
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Manage system users, roles, and permissions
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            size="large"
            onClick={() => console.log('Add new user')}
          >
            Add New User
          </Button>
        </Box>

        {/* Users Table */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={users}
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
            label={`Total Users: ${users.length}`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`Active: ${users.filter(u => u.status === 'active').length}`} 
            color="success" 
            variant="outlined"
          />
          <Chip 
            label={`Suspended: ${users.filter(u => u.status === 'suspended').length}`} 
            color="warning" 
            variant="outlined"
          />
          <Chip 
            label={`Deactivated: ${users.filter(u => u.status === 'deactivated').length}`} 
            color="error" 
            variant="outlined"
          />
          <Chip 
            label={`Pending: ${users.filter(u => u.status === 'pending').length}`} 
            color="info" 
            variant="outlined"
          />
        </Box>
      </Container>
    </Box>
  );
};

export default Users;