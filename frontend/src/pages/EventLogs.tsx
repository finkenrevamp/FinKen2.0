import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  ButtonGroup,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
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
  AccountBalance,
  Description,
  People,
} from '@mui/icons-material';
import Header from '../components/Header';
import type { User } from '../types/auth';
import { apiClient } from '../services/apiClient';

interface EventLogsProps {
  user: User;
  onLogout: () => void;
}

type LogType = 'account' | 'journal' | 'users';

interface EventLog {
  log_id: number;
  user_id: string | null;
  username: string | null;
  timestamp: string;
  action_type: string;
  table_name: string;
  record_id: string | null;
  before_value: Record<string, any> | null;
  after_value: Record<string, any> | null;
}

const EventLogs: React.FC<EventLogsProps> = ({ user, onLogout }) => {
  const [selectedLogType, setSelectedLogType] = useState<LogType>('account');
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch event logs based on selected type
  const fetchEventLogs = async (logType: LogType) => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = 
        logType === 'account' ? '/event-logs/account-events' :
        logType === 'journal' ? '/event-logs/journal-events' :
        '/event-logs/users-events';
      
      const response = await apiClient.get(endpoint);
      setLogs(response.data);
    } catch (err: any) {
      console.error('Failed to fetch event logs:', err);
      setError(err.response?.data?.detail || 'Failed to load event logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventLogs(selectedLogType);
  }, [selectedLogType]);

  // Handle log type selection
  const handleLogTypeChange = (logType: LogType) => {
    setSelectedLogType(logType);
  };

  // Format before/after values for display
  const formatValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return <Typography variant="body2" color="text.secondary">-</Typography>;
    
    if (typeof value === 'object') {
      // Format object as readable key-value pairs
      const entries = Object.entries(value);
      if (entries.length === 0) return <Typography variant="body2" color="text.secondary">Empty</Typography>;
      
      return (
        <Box component="span" sx={{ display: 'block' }}>
          {entries.map(([key, val], index) => (
            <Box key={index} component="span" sx={{ display: 'block', mb: 0.5 }}>
              <strong>{key}:</strong> {val !== null && val !== undefined ? String(val) : 'null'}
            </Box>
          ))}
        </Box>
      );
    }
    
    return String(value);
  };

  // Render before value cell
  const renderBeforeValueCell = (params: GridRenderCellParams) => {
    const beforeValue = params.row.before_value;
    
    if (!beforeValue) {
      return <Typography variant="body2" color="text.secondary">-</Typography>;
    }

    return (
      <Box sx={{ 
        backgroundColor: '#ffebee',
        p: 1.5,
        borderRadius: 1,
        borderLeft: '3px solid',
        borderLeftColor: 'error.main',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Box sx={{ color: 'error.dark', fontSize: '0.875rem', width: '100%' }}>
          {formatValue(beforeValue)}
        </Box>
      </Box>
    );
  };

  // Render after value cell
  const renderAfterValueCell = (params: GridRenderCellParams) => {
    const afterValue = params.row.after_value;
    
    if (!afterValue) {
      return <Typography variant="body2" color="text.secondary">-</Typography>;
    }

    return (
      <Box sx={{ 
        backgroundColor: '#e8f5e9',
        p: 1.5,
        borderRadius: 1,
        borderLeft: '3px solid',
        borderLeftColor: 'success.main',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Box sx={{ color: 'success.dark', fontSize: '0.875rem', width: '100%' }}>
          {formatValue(afterValue)}
        </Box>
      </Box>
    );
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'create':
      case 'insert':
        return 'success';
      case 'update':
      case 'edit':
        return 'info';
      case 'delete':
      case 'remove':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'log_id',
      headerName: 'Log ID',
      width: 80,
      sortable: true,
      filterable: true,
    },
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      width: 180,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return new Date(params.value).toLocaleString();
      },
    },
    {
      field: 'username',
      headerName: 'User',
      width: 150,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return params.value || 'System';
      },
    },
    {
      field: 'action_type',
      headerName: 'Action',
      width: 120,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          color={getActionTypeColor(params.value) as any}
          size="small"
        />
      ),
    },
    {
      field: 'table_name',
      headerName: 'Table',
      width: 180,
      sortable: true,
      filterable: true,
    },
    {
      field: 'before_value',
      headerName: 'Before',
      width: 300,
      sortable: false,
      filterable: false,
      renderCell: renderBeforeValueCell,
    },
    {
      field: 'after_value',
      headerName: 'After',
      width: 300,
      sortable: false,
      filterable: false,
      renderCell: renderAfterValueCell,
    },
  ], [renderBeforeValueCell, renderAfterValueCell]);

  const getLogTypeTitle = () => {
    switch (selectedLogType) {
      case 'account':
        return 'Account Event Logs';
      case 'journal':
        return 'Journal Event Logs';
      case 'users':
        return 'User Event Logs';
      default:
        return 'Event Logs';
    }
  };

  const getLogTypeDescription = () => {
    switch (selectedLogType) {
      case 'account':
        return 'Audit trail for chart of accounts and account-related actions';
      case 'journal':
        return 'Audit trail for journal entries and related transactions';
      case 'users':
        return 'Audit trail for user management and profile changes';
      default:
        return 'System event logs and audit trail';
    }
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', width: '100%' }}>
      <Header user={user} onLogout={onLogout} />
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pt: 10 }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              Event Logs
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {getLogTypeDescription()}
            </Typography>
          </Box>
        </Box>

        {/* Log Type Selection Buttons */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <ButtonGroup variant="outlined" size="large">
            <Button
              variant={selectedLogType === 'account' ? 'contained' : 'outlined'}
              onClick={() => handleLogTypeChange('account')}
              startIcon={<AccountBalance />}
            >
              Account Logs
            </Button>
            <Button
              variant={selectedLogType === 'journal' ? 'contained' : 'outlined'}
              onClick={() => handleLogTypeChange('journal')}
              startIcon={<Description />}
            >
              Journal Logs
            </Button>
            {(user.role === 'Administrator' || user.role === 'Manager') && (
              <Button
                variant={selectedLogType === 'users' ? 'contained' : 'outlined'}
                onClick={() => handleLogTypeChange('users')}
                startIcon={<People />}
              >
                User Logs
              </Button>
            )}
          </ButtonGroup>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Event Logs Table */}
        <Card>
          <CardContent>
            <Typography variant="h5" component="h2" gutterBottom>
              {getLogTypeTitle()}
            </Typography>
            
            <Box sx={{ height: 600, width: '100%', mt: 2 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DataGrid
                  rows={logs}
                  columns={columns}
                  getRowId={(row) => row.log_id}
                  slots={{
                    toolbar: GridToolbar,
                  }}
                  pageSizeOptions={[5, 10, 25, 50, 100]}
                  initialState={{
                    pagination: {
                      paginationModel: {
                        pageSize: 25,
                      },
                    },
                  }}
                  disableRowSelectionOnClick
                  getRowHeight={() => 'auto'}
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
                        display: 'flex',
                        alignItems: 'center',
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
          </CardContent>
        </Card>

        {/* Summary Section */}
        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            label={`Total Logs: ${logs.length}`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`Create Actions: ${logs.filter(l => l.action_type.toLowerCase().includes('create') || l.action_type.toLowerCase().includes('insert')).length}`} 
            color="success" 
            variant="outlined"
          />
          <Chip 
            label={`Update Actions: ${logs.filter(l => l.action_type.toLowerCase().includes('update') || l.action_type.toLowerCase().includes('edit')).length}`} 
            color="info" 
            variant="outlined"
          />
          <Chip 
            label={`Delete Actions: ${logs.filter(l => l.action_type.toLowerCase().includes('delete') || l.action_type.toLowerCase().includes('remove')).length}`} 
            color="error" 
            variant="outlined"
          />
        </Box>
      </Container>
    </Box>
  );
};

export default EventLogs;
