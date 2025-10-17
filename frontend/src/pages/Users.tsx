import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  PlayArrow,
  Block,
} from '@mui/icons-material';
import Header from '../components/Header';
import type { User } from '../types/auth';
import { profileService, type UserData, type UpdateUserRequest } from '../services/profileService';

interface UsersProps {
  user: User;
  onLogout: () => void;
}

interface Role {
  RoleID: number;
  RoleName: string;
}

const Users: React.FC<UsersProps> = ({ user, onLogout }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    user: UserData | null;
    data: UpdateUserRequest;
    loading: boolean;
  }>({
    open: false,
    user: null,
    data: {},
    loading: false,
  });

  // Email dialog state
  const [emailDialog, setEmailDialog] = useState<{
    open: boolean;
    user: UserData | null;
    subject: string;
    body: string;
    loading: boolean;
  }>({
    open: false,
    user: null,
    subject: '',
    body: '',
    loading: false,
  });

  // Suspend dialog state
  const [suspendDialog, setSuspendDialog] = useState<{
    open: boolean;
    user: UserData | null;
    suspensionEndDate: string;
    loading: boolean;
  }>({
    open: false,
    user: null,
    suspensionEndDate: '',
    loading: false,
  });

  // Unsuspend dialog state
  const [unsuspendDialog, setUnsuspendDialog] = useState<{
    open: boolean;
    user: UserData | null;
    loading: boolean;
  }>({
    open: false,
    user: null,
    loading: false,
  });

  // Deactivate dialog state
  const [deactivateDialog, setDeactivateDialog] = useState<{
    open: boolean;
    user: UserData | null;
    loading: boolean;
  }>({
    open: false,
    user: null,
    loading: false,
  });

  // Fetch users
  const fetchUsers = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await profileService.getAllUsers(search);
      setUsers(usersData);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    try {
      // We'll need to import authService for this
      const { authService } = await import('../services/authService');
      const rolesData = await authService.getRoles();
      setRoles(rolesData);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchUsers(searchQuery);
      } else {
        fetchUsers();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, fetchUsers]);

  // Edit handlers
  const handleEdit = (userData: UserData) => {
    setEditDialog({
      open: true,
      user: userData,
      data: {
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        dob: userData.dob,
        address: userData.address,
        role_id: userData.role_id,
      },
      loading: false,
    });
  };

  const handleEditSubmit = async () => {
    if (!editDialog.user) return;

    try {
      setEditDialog((prev) => ({ ...prev, loading: true }));
      await profileService.updateUser(editDialog.user.id, editDialog.data);
      setSnackbar({
        open: true,
        message: 'User updated successfully',
        severity: 'success',
      });
      setEditDialog({ open: false, user: null, data: {}, loading: false });
      fetchUsers(searchQuery || undefined);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to update user',
        severity: 'error',
      });
      setEditDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Email handlers
  const handleEmail = (userData: UserData) => {
    setEmailDialog({
      open: true,
      user: userData,
      subject: '',
      body: '',
      loading: false,
    });
  };

  const handleEmailSubmit = async () => {
    if (!emailDialog.user) return;

    try {
      setEmailDialog((prev) => ({ ...prev, loading: true }));
      await profileService.sendEmailToUser(emailDialog.user.id, {
        subject: emailDialog.subject,
        body: emailDialog.body,
      });
      setSnackbar({
        open: true,
        message: 'Email sent successfully',
        severity: 'success',
      });
      setEmailDialog({ open: false, user: null, subject: '', body: '', loading: false });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to send email',
        severity: 'error',
      });
      setEmailDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Suspend handlers
  const handleSuspend = (userData: UserData) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSuspendDialog({
      open: true,
      user: userData,
      suspensionEndDate: tomorrow.toISOString().split('T')[0],
      loading: false,
    });
  };

  const handleSuspendSubmit = async () => {
    if (!suspendDialog.user) return;

    try {
      setSuspendDialog((prev) => ({ ...prev, loading: true }));
      await profileService.suspendUser(suspendDialog.user.id, suspendDialog.suspensionEndDate);
      setSnackbar({
        open: true,
        message: 'User suspended successfully',
        severity: 'success',
      });
      setSuspendDialog({ open: false, user: null, suspensionEndDate: '', loading: false });
      fetchUsers(searchQuery || undefined);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to suspend user',
        severity: 'error',
      });
      setSuspendDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Unsuspend handlers
  const handleUnsuspend = (userData: UserData) => {
    setUnsuspendDialog({
      open: true,
      user: userData,
      loading: false,
    });
  };

  const handleUnsuspendSubmit = async () => {
    if (!unsuspendDialog.user) return;

    try {
      setUnsuspendDialog((prev) => ({ ...prev, loading: true }));
      await profileService.unsuspendUser(unsuspendDialog.user.id);
      setSnackbar({
        open: true,
        message: 'User unsuspended successfully',
        severity: 'success',
      });
      setUnsuspendDialog({ open: false, user: null, loading: false });
      fetchUsers(searchQuery || undefined);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to unsuspend user',
        severity: 'error',
      });
      setUnsuspendDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Deactivate handlers
  const handleDeactivate = (userData: UserData) => {
    setDeactivateDialog({
      open: true,
      user: userData,
      loading: false,
    });
  };

  const handleDeactivateSubmit = async () => {
    if (!deactivateDialog.user) return;

    try {
      setDeactivateDialog((prev) => ({ ...prev, loading: true }));
      await profileService.deactivateUser(deactivateDialog.user.id);
      setSnackbar({
        open: true,
        message: 'User deactivated successfully',
        severity: 'success',
      });
      setDeactivateDialog({ open: false, user: null, loading: false });
      fetchUsers(searchQuery || undefined);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to deactivate user',
        severity: 'error',
      });
      setDeactivateDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const getStatusColor = (userData: UserData) => {
    if (!userData.is_active) return 'error';
    if (userData.is_suspended) return 'warning';
    return 'success';
  };

  const getStatusLabel = (userData: UserData) => {
    if (!userData.is_active) return 'Deactivated';
    if (userData.is_suspended) return 'Suspended';
    return 'Active';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrator':
        return 'error';
      case 'Manager':
        return 'primary';
      case 'Accountant':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'profile_id',
      headerName: 'User ID',
      width: 70,
      sortable: true,
      filterable: true,
    },
    {
      field: 'username',
      headerName: 'Username',
      width: 120,
      sortable: true,
      filterable: true,
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 180,
      sortable: true,
      filterable: true,
      valueGetter: (_value, row) => `${row.first_name} ${row.last_name}`,
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 230,
      sortable: true,
      filterable: true,
    },
    {
      field: 'dob',
      headerName: 'Date of Birth',
      width: 120,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return params.value ? new Date(params.value).toLocaleDateString() : 'N/A';
      },
    },
    {
      field: 'address',
      headerName: 'Address',
      width: 210,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return params.value || 'N/A';
      },
    },
    {
      field: 'role_name',
      headerName: 'Role',
      width: 130,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
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
      renderCell: (params: GridRenderCellParams) => {
        const userData = params.row as UserData;
        return (
          <Chip
            label={getStatusLabel(userData)}
            color={getStatusColor(userData) as any}
            size="small"
          />
        );
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
      field: 'actions',
      headerName: 'Actions',
      width: 170,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params: GridRenderCellParams) => {
        const userData = params.row as UserData;
        const isDeactivated = !userData.is_active;
        const isSuspended = userData.is_suspended;
        
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Edit User">
              <IconButton
                size="small"
                onClick={() => handleEdit(userData)}
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
                onClick={() => handleEmail(userData)}
                sx={{ 
                  color: 'info.main',
                  '&:hover': { backgroundColor: 'info.light', color: 'white' }
                }}
              >
                <Email fontSize="small" />
              </IconButton>
            </Tooltip>
            
            {!isSuspended ? (
              <Tooltip title="Suspend User">
                <IconButton
                  size="small"
                  onClick={() => handleSuspend(userData)}
                  disabled={isDeactivated}
                  sx={{ 
                    color: 'warning.main',
                    '&:hover': { backgroundColor: 'warning.light', color: 'white' },
                    '&:disabled': { color: 'grey.400' }
                  }}
                >
                  <PauseCircle fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Unsuspend User">
                <IconButton
                  size="small"
                  onClick={() => handleUnsuspend(userData)}
                  sx={{ 
                    color: 'success.main',
                    '&:hover': { backgroundColor: 'success.light', color: 'white' }
                  }}
                >
                  <PlayArrow fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Deactivate User">
              <IconButton
                size="small"
                onClick={() => handleDeactivate(userData)}
                disabled={isDeactivated}
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
        </Box>

        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Search users by username or email"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type to search..."
          />
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Users Table */}
        <Box sx={{ height: 600, width: '100%' }}>
          {loading && !users.length ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={users}
              columns={columns}
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
            label={`Total Users: ${users.length}`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`Active: ${users.filter(u => u.is_active && !u.is_suspended).length}`} 
            color="success" 
            variant="outlined"
          />
          <Chip 
            label={`Suspended: ${users.filter(u => u.is_suspended).length}`} 
            color="warning" 
            variant="outlined"
          />
          <Chip 
            label={`Deactivated: ${users.filter(u => !u.is_active).length}`} 
            color="error" 
            variant="outlined"
          />
        </Box>
      </Container>

      {/* Edit User Dialog */}
      <Dialog 
        open={editDialog.open} 
        onClose={() => !editDialog.loading && setEditDialog({ open: false, user: null, data: {}, loading: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Username"
              value={editDialog.data.username || ''}
              onChange={(e) => setEditDialog((prev) => ({ ...prev, data: { ...prev.data, username: e.target.value } }))}
              fullWidth
            />
            <TextField
              label="First Name"
              value={editDialog.data.first_name || ''}
              onChange={(e) => setEditDialog((prev) => ({ ...prev, data: { ...prev.data, first_name: e.target.value } }))}
              fullWidth
            />
            <TextField
              label="Last Name"
              value={editDialog.data.last_name || ''}
              onChange={(e) => setEditDialog((prev) => ({ ...prev, data: { ...prev.data, last_name: e.target.value } }))}
              fullWidth
            />
            <TextField
              label="Date of Birth"
              type="date"
              value={editDialog.data.dob || ''}
              onChange={(e) => setEditDialog((prev) => ({ ...prev, data: { ...prev.data, dob: e.target.value } }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Address"
              value={editDialog.data.address || ''}
              onChange={(e) => setEditDialog((prev) => ({ ...prev, data: { ...prev.data, address: e.target.value } }))}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Role"
              select
              value={editDialog.data.role_id || ''}
              onChange={(e) => setEditDialog((prev) => ({ ...prev, data: { ...prev.data, role_id: Number(e.target.value) } }))}
              fullWidth
            >
              {roles.map((role) => (
                <MenuItem key={role.RoleID} value={role.RoleID}>
                  {role.RoleName}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, user: null, data: {}, loading: false })} disabled={editDialog.loading}>
            Cancel
          </Button>
          <Button onClick={handleEditSubmit} variant="contained" disabled={editDialog.loading}>
            {editDialog.loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email User Dialog */}
      <Dialog 
        open={emailDialog.open} 
        onClose={() => !emailDialog.loading && setEmailDialog({ open: false, user: null, subject: '', body: '', loading: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Send Email to {emailDialog.user?.first_name} {emailDialog.user?.last_name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="To"
              value={emailDialog.user?.email || ''}
              fullWidth
              disabled
            />
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
          <Button onClick={() => setEmailDialog({ open: false, user: null, subject: '', body: '', loading: false })} disabled={emailDialog.loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleEmailSubmit} 
            variant="contained" 
            disabled={emailDialog.loading || !emailDialog.subject || !emailDialog.body}
          >
            {emailDialog.loading ? <CircularProgress size={24} /> : 'Send Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Suspend User Dialog */}
      <Dialog 
        open={suspendDialog.open} 
        onClose={() => !suspendDialog.loading && setSuspendDialog({ open: false, user: null, suspensionEndDate: '', loading: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Suspend User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Typography>
              Suspend <strong>{suspendDialog.user?.first_name} {suspendDialog.user?.last_name}</strong> until:
            </Typography>
            <TextField
              label="Suspension End Date"
              type="date"
              value={suspendDialog.suspensionEndDate}
              onChange={(e) => setSuspendDialog((prev) => ({ ...prev, suspensionEndDate: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date().toISOString().split('T')[0] }}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialog({ open: false, user: null, suspensionEndDate: '', loading: false })} disabled={suspendDialog.loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSuspendSubmit} 
            variant="contained" 
            color="warning"
            disabled={suspendDialog.loading || !suspendDialog.suspensionEndDate}
          >
            {suspendDialog.loading ? <CircularProgress size={24} /> : 'Suspend User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unsuspend User Dialog */}
      <Dialog 
        open={unsuspendDialog.open} 
        onClose={() => !unsuspendDialog.loading && setUnsuspendDialog({ open: false, user: null, loading: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Unsuspend User</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 2 }}>
            Are you sure you want to unsuspend <strong>{unsuspendDialog.user?.first_name} {unsuspendDialog.user?.last_name}</strong>?
          </Typography>
          <Typography sx={{ mt: 2, color: 'success.main' }}>
            This will immediately restore the user's access to the system.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnsuspendDialog({ open: false, user: null, loading: false })} disabled={unsuspendDialog.loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUnsuspendSubmit} 
            variant="contained" 
            color="success"
            disabled={unsuspendDialog.loading}
          >
            {unsuspendDialog.loading ? <CircularProgress size={24} /> : 'Unsuspend User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate User Dialog */}
      <Dialog 
        open={deactivateDialog.open} 
        onClose={() => !deactivateDialog.loading && setDeactivateDialog({ open: false, user: null, loading: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Deactivate User</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 2 }}>
            Are you sure you want to deactivate <strong>{deactivateDialog.user?.first_name} {deactivateDialog.user?.last_name}</strong>?
          </Typography>
          <Typography sx={{ mt: 2, color: 'warning.main' }}>
            This will prevent the user from accessing the system. This action can be reversed by an administrator.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateDialog({ open: false, user: null, loading: false })} disabled={deactivateDialog.loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeactivateSubmit} 
            variant="contained" 
            color="error"
            disabled={deactivateDialog.loading}
          >
            {deactivateDialog.loading ? <CircularProgress size={24} /> : 'Deactivate User'}
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

export default Users;