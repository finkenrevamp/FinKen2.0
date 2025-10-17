import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
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
} from '@mui/icons-material';
import Header from '../components/Header';
import type { User } from '../types/auth';
import { authService, type RegistrationRequestData } from '../services/authService';

interface ManageRegistrationRequestsProps {
  user: User;
  onLogout: () => void;
}

interface ApprovalDialogData {
  requestId: string;
  name: string;
}

interface RejectionDialogData {
  requestId: string;
  name: string;
}

const ManageRegistrationRequests: React.FC<ManageRegistrationRequestsProps> = ({ user, onLogout }) => {
  const [requests, setRequests] = useState<RegistrationRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Approval dialog state
  const [approvalDialog, setApprovalDialog] = useState<ApprovalDialogData | null>(null);
  const [approvalRoleId, setApprovalRoleId] = useState<number>(3); // Default to Accountant
  const [approvalLoading, setApprovalLoading] = useState(false);
  
  // Rejection dialog state
  const [rejectionDialog, setRejectionDialog] = useState<RejectionDialogData | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionLoading, setRejectionLoading] = useState(false);
  


  // Fetch registration requests on mount
  useEffect(() => {
    fetchRegistrationRequests();
  }, []);

  const fetchRegistrationRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.getRegistrationRequests();
      setRequests(data);
    } catch (err) {
      let errorMessage = 'Failed to load registration requests';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Provide more helpful error messages
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          errorMessage = 'Unauthorized: You must be logged in as an Administrator to view registration requests. Please sign in again.';
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
          errorMessage = 'Access Denied: Only Administrators can view registration requests. Your account does not have the required permissions.';
        }
      }
      
      setError(errorMessage);
      console.error('Failed to fetch registration requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = useCallback((requestId: string) => {
    console.log('handleApprove called with requestId:', requestId);
    const request = requests.find(r => r.requestId === requestId);
    console.log('Found request:', request);
    if (request) {
      setApprovalDialog({ requestId, name: request.name });
      setApprovalRoleId(3); // Default to Accountant
      console.log('Approval dialog set');
    } else {
      console.error('Request not found for requestId:', requestId);
    }
  }, [requests]);

  const handleApproveConfirm = async () => {
    if (!approvalDialog) {
      return;
    }

    try {
      setApprovalLoading(true);
      setError(null);
      
      const requestIdNum = parseInt(approvalDialog.requestId.replace('REQ', ''));
      const response = await authService.approveRegistrationRequest(
        requestIdNum,
        approvalRoleId
      );
      
      setSuccessMessage(response.message || 'Registration request approved successfully. User will receive an email with setup instructions.');
      setApprovalDialog(null);
      
      // Refresh the list
      await fetchRegistrationRequests();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve registration request';
      setError(errorMessage);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleReject = useCallback((requestId: string) => {
    console.log('handleReject called with requestId:', requestId);
    const request = requests.find(r => r.requestId === requestId);
    console.log('Found request:', request);
    if (request) {
      setRejectionDialog({ requestId, name: request.name });
      setRejectionReason('');
      console.log('Rejection dialog set');
    } else {
      console.error('Request not found for requestId:', requestId);
    }
  }, [requests]);

  const handleRejectConfirm = async () => {
    if (!rejectionDialog || !rejectionReason) {
      return;
    }

    try {
      setRejectionLoading(true);
      setError(null);
      
      const requestIdNum = parseInt(rejectionDialog.requestId.replace('REQ', ''));
      const response = await authService.rejectRegistrationRequest(
        requestIdNum,
        rejectionReason
      );
      
      setSuccessMessage(response.message || 'Registration request rejected successfully');
      setRejectionDialog(null);
      setRejectionReason('');
      
      // Refresh the list
      await fetchRegistrationRequests();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject registration request';
      setError(errorMessage);
    } finally {
      setRejectionLoading(false);
    }
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

  // Debug: Log requests data
  useEffect(() => {
    console.log('Registration requests data:', requests);
    console.log('Pending requests:', requests.filter(r => r.status === 'pending'));
  }, [requests]);

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
        console.log('Action cell render - RequestID:', requestData.requestId, 'Status:', requestData.status);
        
        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
            {requestData.status === 'pending' && (
              <>
                <Tooltip title="Approve Request">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Approve clicked for:', requestData.requestId);
                      handleApprove(requestData.requestId);
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Reject clicked for:', requestData.requestId);
                      handleReject(requestData.requestId);
                    }}
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
  ], [handleApprove, handleReject]); // Add dependencies

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

        {/* Error and Success Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
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
          </>
        )}
      </Container>

      {/* Approval Dialog */}
      <Dialog open={!!approvalDialog} onClose={() => setApprovalDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Registration Request</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Approve registration request for <strong>{approvalDialog?.name}</strong>?
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The user will receive an email with a link to complete their account setup, including setting their password and security question.
          </Typography>
          
          <TextField
            select
            fullWidth
            label="Role"
            value={approvalRoleId}
            onChange={(e) => setApprovalRoleId(Number(e.target.value))}
          >
            <MenuItem value={1}>Administrator</MenuItem>
            <MenuItem value={2}>Manager</MenuItem>
            <MenuItem value={3}>Accountant</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(null)} disabled={approvalLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleApproveConfirm} 
            variant="contained" 
            color="success"
            disabled={approvalLoading}
          >
            {approvalLoading ? <CircularProgress size={24} /> : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={!!rejectionDialog} onClose={() => setRejectionDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Registration Request</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Reject registration request for <strong>{rejectionDialog?.name}</strong>?
          </Typography>
          
          <TextField
            fullWidth
            label="Reason for Rejection"
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Please provide a reason for rejecting this request..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectionDialog(null)} disabled={rejectionLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleRejectConfirm} 
            variant="contained" 
            color="error"
            disabled={rejectionLoading || !rejectionReason}
          >
            {rejectionLoading ? <CircularProgress size={24} /> : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageRegistrationRequests;