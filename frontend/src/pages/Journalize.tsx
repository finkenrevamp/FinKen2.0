import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
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
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import Header from '../components/Header';
import NewJournalEntryDialog from '../components/NewJournalEntryDialog';
import type { User } from '../types/auth';
import { 
  journalEntriesService, 
  type JournalEntry,
  type JournalEntryLine,
} from '../services/journalEntriesService';

interface JournalizeProps {
  user: User;
  onLogout: () => void;
}

const Journalize: React.FC<JournalizeProps> = ({ user, onLogout }) => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Details dialog state
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // New entry dialog state
  const [newEntryOpen, setNewEntryOpen] = useState(false);

  // Fetch journal entries
  const fetchJournalEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (startDate) filters.start_date = startDate;
      if (endDate) filters.end_date = endDate;
      
      const entries = await journalEntriesService.getAllJournalEntries(filters);
      setJournalEntries(entries);
    } catch (err: any) {
      console.error('Failed to fetch journal entries:', err);
      setError(err.message || 'Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchJournalEntries();
  }, [fetchJournalEntries]);

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    return journalEntries.filter((entry) => {
      const searchLower = searchQuery.toLowerCase();
      return !searchQuery || 
        entry.journal_entry_id.toString().includes(searchLower) ||
        entry.description?.toLowerCase().includes(searchLower) ||
        entry.created_by_username.toLowerCase().includes(searchLower) ||
        entry.status.toLowerCase().includes(searchLower);
    });
  }, [journalEntries, searchQuery]);

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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'Rejected':
        return <CancelIcon sx={{ color: 'error.main', fontSize: 20 }} />;
      default:
        return <PendingIcon sx={{ color: 'warning.main', fontSize: 20 }} />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  // Calculate totals for an entry
  const calculateEntryTotals = (lines: JournalEntryLine[]) => {
    const totalDebit = lines
      .filter(line => line.type === 'Debit')
      .reduce((sum, line) => sum + parseFloat(line.amount), 0);
    
    const totalCredit = lines
      .filter(line => line.type === 'Credit')
      .reduce((sum, line) => sum + parseFloat(line.amount), 0);
    
    return { totalDebit, totalCredit };
  };

  // Handle row click to open details dialog
  const handleRowClick = async (entry: JournalEntry) => {
    try {
      // Fetch full details including attachments
      const fullEntry = await journalEntriesService.getJournalEntry(entry.journal_entry_id);
      setSelectedEntry(fullEntry);
      setDetailsOpen(true);
    } catch (err: any) {
      console.error('Failed to fetch entry details:', err);
      setError(err.message || 'Failed to load entry details');
    }
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedEntry(null);
  };

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'entry_date',
      headerName: 'Date',
      width: 120,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return formatDate(params.value);
      },
    },
    {
      field: 'is_adjusting_entry',
      headerName: 'Entry Type',
      width: 130,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return params.value ? 'Adjusting' : 'Regular';
      },
    },
    {
      field: 'created_by_username',
      headerName: 'Created By',
      width: 150,
      sortable: true,
      filterable: true,
    },
    {
      field: 'accounts',
      headerName: 'Accounts',
      flex: 1,
      minWidth: 200,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => {
        const entry = params.row as JournalEntry;
        const accountNames = entry.lines
          .map(line => `${line.account_number} - ${line.account_name}`)
          .join(', ');
        return (
          <Box sx={{ 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis' 
          }}>
            {accountNames}
          </Box>
        );
      },
    },
    {
      field: 'debit',
      headerName: 'Debit',
      width: 130,
      sortable: true,
      filterable: true,
      align: 'right',
      renderCell: (params: GridRenderCellParams) => {
        const entry = params.row as JournalEntry;
        const { totalDebit } = calculateEntryTotals(entry.lines);
        return formatCurrency(totalDebit.toString());
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
        const entry = params.row as JournalEntry;
        const { totalCredit } = calculateEntryTotals(entry.lines);
        return formatCurrency(totalCredit.toString());
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getStatusIcon(params.value)}
            <Chip 
              label={params.value}
              color={getStatusColor(params.value)}
              size="small"
            />
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              Journal Entries
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create and manage journal entries for your accounting records
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            size="large"
            onClick={() => setNewEntryOpen(true)}
            sx={{ height: 'fit-content' }}
          >
            New Entry
          </Button>
        </Box>

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
                placeholder="Search by ID, description, creator, or status..."
              />
            </Box>
            <Box sx={{ flex: '0 1 150px' }}>
              <TextField
                fullWidth
                label="Status"
                variant="outlined"
                select
                SelectProps={{ native: true }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
              >
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </TextField>
            </Box>
            <Box sx={{ flex: '0 1 180px' }}>
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
            <Box sx={{ flex: '0 1 180px' }}>
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
                onClick={fetchJournalEntries}
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

        {/* Journal Entries Table */}
        <Box sx={{ height: 600, width: '100%' }}>
          {loading && !journalEntries.length ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredEntries}
              columns={columns}
              getRowId={(row) => row.journal_entry_id}
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
              onRowClick={(params) => handleRowClick(params.row as JournalEntry)}
              loading={loading}
              sx={{
                cursor: 'pointer',
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
                  },
                  '& .MuiDataGrid-row': {
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      cursor: 'pointer',
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
            label={`Pending: ${filteredEntries.filter(e => e.status === 'Pending').length}`} 
            color="warning" 
            variant="outlined"
          />
          <Chip 
            label={`Approved: ${filteredEntries.filter(e => e.status === 'Approved').length}`} 
            color="success" 
            variant="outlined"
          />
          <Chip 
            label={`Rejected: ${filteredEntries.filter(e => e.status === 'Rejected').length}`} 
            color="error" 
            variant="outlined"
          />
        </Box>
      </Container>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5">
              Journal Entry #{selectedEntry?.journal_entry_id}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {selectedEntry && getStatusIcon(selectedEntry.status)}
              <Chip 
                label={selectedEntry?.status}
                color={selectedEntry ? getStatusColor(selectedEntry.status) : 'default'}
                size="small"
              />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedEntry && (
            <Box>
              {/* Entry Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Entry Information
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Entry Date
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(selectedEntry.entry_date)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Entry Type
                    </Typography>
                    <Typography variant="body1">
                      {selectedEntry.is_adjusting_entry ? 'Adjusting Entry' : 'Regular Entry'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Created By
                    </Typography>
                    <Typography variant="body1">
                      {selectedEntry.created_by_username}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Created On
                    </Typography>
                    <Typography variant="body1">
                      {formatDateTime(selectedEntry.creation_date)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Description */}
              {selectedEntry.description && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {selectedEntry.description}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Account Lines */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Account Lines
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Account</TableCell>
                        <TableCell align="right">Debit</TableCell>
                        <TableCell align="right">Credit</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedEntry.lines.map((line) => (
                        <TableRow key={line.line_id}>
                          <TableCell>
                            {line.account_number} - {line.account_name}
                          </TableCell>
                          <TableCell align="right">
                            {line.type === 'Debit' ? formatCurrency(line.amount) : '-'}
                          </TableCell>
                          <TableCell align="right">
                            {line.type === 'Credit' ? formatCurrency(line.amount) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'grey.50', fontWeight: 'bold' }}>
                        <TableCell>
                          <strong>Total</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>
                            {formatCurrency(
                              calculateEntryTotals(selectedEntry.lines).totalDebit.toString()
                            )}
                          </strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>
                            {formatCurrency(
                              calculateEntryTotals(selectedEntry.lines).totalCredit.toString()
                            )}
                          </strong>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Approval/Rejection Information */}
              {selectedEntry.status === 'Approved' && selectedEntry.approved_by_username && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Approval Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Approved By
                      </Typography>
                      <Typography variant="body1">
                        {selectedEntry.approved_by_username}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Approved On
                      </Typography>
                      <Typography variant="body1">
                        {selectedEntry.approval_date && formatDateTime(selectedEntry.approval_date)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {selectedEntry.status === 'Rejected' && selectedEntry.rejection_reason && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Rejection Information
                  </Typography>
                  <Alert severity="error">
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Rejection Reason
                    </Typography>
                    <Typography variant="body1">
                      {selectedEntry.rejection_reason}
                    </Typography>
                  </Alert>
                </Box>
              )}

              {/* Attachments */}
              {selectedEntry.attachments && selectedEntry.attachments.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Attachments ({selectedEntry.attachments.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>File Name</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Size</TableCell>
                          <TableCell>Uploaded By</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedEntry.attachments.map((attachment) => (
                          <TableRow key={attachment.attachment_id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AttachFileIcon fontSize="small" />
                                <Link href={attachment.file_path} target="_blank" rel="noopener">
                                  {attachment.file_name}
                                </Link>
                              </Box>
                            </TableCell>
                            <TableCell>{attachment.file_type || 'N/A'}</TableCell>
                            <TableCell align="right">
                              {attachment.file_size 
                                ? `${(attachment.file_size / 1024).toFixed(2)} KB`
                                : 'N/A'
                              }
                            </TableCell>
                            <TableCell>{attachment.uploaded_by_username}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* New Entry Dialog */}
      <NewJournalEntryDialog
        open={newEntryOpen}
        onClose={() => setNewEntryOpen(false)}
        onSuccess={() => {
          fetchJournalEntries();
        }}
      />
    </Box>
  );
};

export default Journalize;
