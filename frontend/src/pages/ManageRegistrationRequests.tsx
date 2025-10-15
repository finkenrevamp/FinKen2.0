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
  CheckCircle,
  Cancel,
  Visibility,
} from '@mui/icons-material';
import Header from '../components/Header';
import type { User } from '../types/auth';

interface ManageRegistrationRequestsProps {
  user: User;
  onLogout: () => void;
}

interface RegistrationRequestData {
  id: string;
  requestId: string;
  name: string;
  email: string;
  dateOfBirth: string;
  address: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewDate?: string;
}

const ManageRegistrationRequests: React.FC<ManageRegistrationRequestsProps> = ({ user, onLogout }) => {
  // Mock data for demonstration - in real app this would come from API
  const [requests] = useState<RegistrationRequestData[]>([
    {
      id: '1',
      requestId: 'REQ001',
      name: 'Michael Johnson',
      email: 'michael.johnson@example.com',
      dateOfBirth: '1987-05-20',
      address: '567 Broadway St, New York, NY 10012',
      requestDate: '2024-03-15',
      status: 'pending',
    },
    {
      id: '2',
      requestId: 'REQ002',
      name: 'Sarah Williams',
      email: 'sarah.williams@example.com',
      dateOfBirth: '1992-08-14',
      address: '890 Sunset Blvd, Los Angeles, CA 90028',
      requestDate: '2024-03-14',
      status: 'approved',
      reviewedBy: 'Admin User',
      reviewDate: '2024-03-16',
    },
    {
      id: '3',
      requestId: 'REQ003',
      name: 'David Miller',
      email: 'david.miller@example.com',
      dateOfBirth: '1985-12-03',
      address: '234 Lake Shore Dr, Chicago, IL 60611',
      requestDate: '2024-03-13',
      status: 'rejected',
      reviewedBy: 'Admin User',
      reviewDate: '2024-03-15',
    },
    {
      id: '4',
      requestId: 'REQ004',
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@example.com',
      dateOfBirth: '1990-02-18',
      address: '456 River St, Austin, TX 78701',
      requestDate: '2024-03-12',
      status: 'pending',
    },
    {
      id: '5',
      requestId: 'REQ005',
      name: 'James Thompson',
      email: 'james.thompson@example.com',
      dateOfBirth: '1983-09-25',
      address: '789 Mountain View Dr, Denver, CO 80202',
      requestDate: '2024-03-11',
      status: 'approved',
      reviewedBy: 'Manager User',
      reviewDate: '2024-03-13',
    },
    {
      id: '6',
      requestId: 'REQ006',
      name: 'Lisa Anderson',
      email: 'lisa.anderson@example.com',
      dateOfBirth: '1989-06-07',
      address: '321 Ocean Ave, Miami, FL 33139',
      requestDate: '2024-03-10',
      status: 'pending',
    },
  ]);

  const handleApprove = (requestId: string) => {
    console.log('Approve request:', requestId);
    // TODO: Implement approve functionality
  };

  const handleReject = (requestId: string) => {
    console.log('Reject request:', requestId);
    // TODO: Implement reject functionality
  };

  const handleView = (requestId: string) => {
    console.log('View request details:', requestId);
    // TODO: Implement view functionality
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'requestId',
      headerName: 'Request ID',
      width: 100,
      sortable: true,
      filterable: true,
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 150,
      sortable: true,
      filterable: true,
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 220,
      sortable: true,
      filterable: true,
    },
    {
      field: 'dateOfBirth',
      headerName: 'Date of Birth',
      width: 120,
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
      field: 'requestDate',
      headerName: 'Request Date',
      width: 120,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return new Date(params.value).toLocaleDateString();
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
          label={params.value.charAt(0).toUpperCase() + params.value.slice(1)}
          color={getStatusColor(params.value) as any}
          size="small"
        />
      ),
    },
    {
      field: 'reviewedBy',
      headerName: 'Reviewed By',
      width: 130,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return params.value || '-';
      },
    },
    {
      field: 'reviewDate',
      headerName: 'Review Date',
      width: 120,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return params.value ? new Date(params.value).toLocaleDateString() : '-';
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
        const requestData = params.row as RegistrationRequestData;
        
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="View Details">
              <IconButton
                size="small"
                onClick={() => handleView(requestData.requestId)}
                sx={{ 
                  color: 'info.main',
                  '&:hover': { backgroundColor: 'info.light', color: 'white' }
                }}
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
            
            {requestData.status === 'pending' && (
              <>
                <Tooltip title="Approve Request">
                  <IconButton
                    size="small"
                    onClick={() => handleApprove(requestData.requestId)}
                    sx={{ 
                      color: 'success.main',
                      '&:hover': { backgroundColor: 'success.light', color: 'white' }
                    }}
                  >
                    <CheckCircle fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Reject Request">
                  <IconButton
                    size="small"
                    onClick={() => handleReject(requestData.requestId)}
                    sx={{ 
                      color: 'error.main',
                      '&:hover': { backgroundColor: 'error.light', color: 'white' }
                    }}
                  >
                    <Cancel fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
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
              Manage Registration Requests
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Review and manage user registration requests
            </Typography>
          </Box>
        </Box>

        {/* Registration Requests Table */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={requests}
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
            label={`Total Requests: ${requests.length}`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`Pending: ${requests.filter(r => r.status === 'pending').length}`} 
            color="warning" 
            variant="outlined"
          />
          <Chip 
            label={`Approved: ${requests.filter(r => r.status === 'approved').length}`} 
            color="success" 
            variant="outlined"
          />
          <Chip 
            label={`Rejected: ${requests.filter(r => r.status === 'rejected').length}`} 
            color="error" 
            variant="outlined"
          />
        </Box>
      </Container>
    </Box>
  );
};

export default ManageRegistrationRequests;