import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
  Delete as DeleteIcon,
  Edit as EditIcon,
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
  const location = useLocation();
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
  
  // Edit entry dialog state
  const [editEntryOpen, setEditEntryOpen] = useState(false);
  
  // Approval/Rejection state
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Delete state
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
      
      // Debug logging
      if (entries.length > 0) {
        console.log('First entry sample:', {
          created_by_username: entries[0].created_by_username,
          lines_count: entries[0].lines?.length,
          first_line: entries[0].lines?.[0]
        });
      }
      
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

  // Handle opening a specific journal entry from navigation state
  useEffect(() => {
    const openEntryId = (location.state as any)?.openEntryId;
    if (openEntryId && journalEntries.length > 0 && !detailsOpen) {
      // Find and open the specific journal entry
      const entryToOpen = journalEntries.find(
        (entry) => entry.journal_entry_id === openEntryId
      );
      if (entryToOpen) {
        // Fetch full details and open dialog
        const loadEntryDetails = async () => {
          try {
            const fullEntry = await journalEntriesService.getJournalEntry(entryToOpen.journal_entry_id);
            setSelectedEntry(fullEntry);
            setDetailsOpen(true);
          } catch (err: any) {
            console.error('Failed to fetch entry details:', err);
            setError(err.message || 'Failed to load entry details');
          }
        };
        loadEntryDetails();
      }
    }
  }, [location.state, journalEntries, detailsOpen]);

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

  const handleApprove = async () => {
    if (!selectedEntry) return;
    
    try {
      setApproving(true);
      setError(null);
      
      await journalEntriesService.approveJournalEntry(selectedEntry.journal_entry_id);
      
      // Refresh entries and close dialog
      await fetchJournalEntries();
      setDetailsOpen(false);
      setSelectedEntry(null);
    } catch (err: any) {
      console.error('Failed to approve journal entry:', err);
      setError(err.message || 'Failed to approve journal entry');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectClick = () => {
    setRejectDialogOpen(true);
  };

  const handleRejectCancel = () => {
    setRejectDialogOpen(false);
    setRejectionReason('');
  };

  const handleRejectConfirm = async () => {
    if (!selectedEntry || !rejectionReason.trim()) return;
    
    try {
      setRejecting(true);
      setError(null);
      
      await journalEntriesService.rejectJournalEntry(
        selectedEntry.journal_entry_id,
        rejectionReason
      );
      
      // Refresh entries and close dialogs
      await fetchJournalEntries();
      setRejectDialogOpen(false);
      setRejectionReason('');
      setDetailsOpen(false);
      setSelectedEntry(null);
    } catch (err: any) {
      console.error('Failed to reject journal entry:', err);
      setError(err.message || 'Failed to reject journal entry');
    } finally {
      setRejecting(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEntry) return;
    
    try {
      setDeleting(true);
      setError(null);
      
      await journalEntriesService.deleteJournalEntry(selectedEntry.journal_entry_id);
      
      // Refresh entries and close dialogs
      await fetchJournalEntries();
      setDeleteDialogOpen(false);
      setDetailsOpen(false);
      setSelectedEntry(null);
    } catch (err: any) {
      console.error('Failed to delete journal entry:', err);
      setError(err.message || 'Failed to delete journal entry');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = () => {
    setDetailsOpen(false); // Close details dialog
    setEditEntryOpen(true); // Open edit dialog
  };

  const handleEditSuccess = async () => {
    await fetchJournalEntries();
    setEditEntryOpen(false);
    setSelectedEntry(null);
  };

  const canApproveOrReject = user.role === 'Manager' || user.role === 'Administrator';
  
  // Check if current user can edit/delete the selected entry
  const canEditOrDelete = selectedEntry && (
    selectedEntry.created_by_username === user.username || 
    user.role === 'Administrator'
  ) && selectedEntry.status === 'Pending';

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
      minWidth: 250,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => {
        const entry = params.row as JournalEntry;
        const debitLines = entry.lines.filter(line => line.type === 'Debit');
        const creditLines = entry.lines.filter(line => line.type === 'Credit');
        
        return (
          <Box sx={{ 
            py: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}>
            {debitLines.map((line, idx) => (
              <Box key={`debit-${idx}`} sx={{ lineHeight: 1.5 }}>
                {line.account_number} - {line.account_name}
              </Box>
            ))}
            {creditLines.map((line, idx) => (
              <Box key={`credit-${idx}`} sx={{ lineHeight: 1.5, pl: 4 }}>
                {line.account_number} - {line.account_name}
              </Box>
            ))}
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
        const debitLines = entry.lines.filter(line => line.type === 'Debit');
        const creditLines = entry.lines.filter(line => line.type === 'Credit');
        
        return (
          <Box sx={{ 
            py: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            alignItems: 'flex-end',
            width: '100%',
          }}>
            {debitLines.map((line, idx) => (
              <Box key={`debit-${idx}`} sx={{ lineHeight: 1.5 }}>
                {formatCurrency(line.amount)}
              </Box>
            ))}
            {creditLines.map((_, idx) => (
              <Box key={`credit-${idx}`} sx={{ lineHeight: 1.5 }}>
                -
              </Box>
            ))}
          </Box>
        );
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
        const debitLines = entry.lines.filter(line => line.type === 'Debit');
        const creditLines = entry.lines.filter(line => line.type === 'Credit');
        
        return (
          <Box sx={{ 
            py: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            alignItems: 'flex-end',
            width: '100%',
          }}>
            {debitLines.map((_, idx) => (
              <Box key={`debit-${idx}`} sx={{ lineHeight: 1.5 }}>
                -
              </Box>
            ))}
            {creditLines.map((line, idx) => (
              <Box key={`credit-${idx}`} sx={{ lineHeight: 1.5 }}>
                {formatCurrency(line.amount)}
              </Box>
            ))}
          </Box>
        );
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
              getRowHeight={() => 'auto'}
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
                    display: 'flex',
                    alignItems: 'center',
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
          <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* Edit and Delete buttons for entry creator or administrator */}
              {canEditOrDelete && (
                <>
                  <Button
                    onClick={handleEditClick}
                    variant="outlined"
                    color="primary"
                    startIcon={<EditIcon />}
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={handleDeleteClick}
                    variant="outlined"
                    color="error"
                    disabled={deleting}
                    startIcon={<DeleteIcon />}
                  >
                    Delete
                  </Button>
                </>
              )}
              
              {/* Approve/Reject buttons for managers and administrators */}
              {selectedEntry && selectedEntry.status === 'Pending' && canApproveOrReject && (
                <>
                  <Button
                    onClick={handleApprove}
                    variant="contained"
                    color="success"
                    disabled={approving}
                    startIcon={<CheckCircleIcon />}
                  >
                    {approving ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button
                    onClick={handleRejectClick}
                    variant="contained"
                    color="error"
                    disabled={rejecting}
                    startIcon={<CancelIcon />}
                  >
                    Reject
                  </Button>
                </>
              )}
            </Box>
            <Button onClick={handleCloseDetails}>Close</Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialogOpen} onClose={handleRejectCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Journal Entry</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom sx={{ mt: 1 }}>
            Please provide a reason for rejecting this journal entry:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason (minimum 5 characters)..."
            sx={{ mt: 2 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectCancel} disabled={rejecting}>
            Cancel
          </Button>
          <Button
            onClick={handleRejectConfirm}
            variant="contained"
            color="error"
            disabled={rejecting || rejectionReason.trim().length < 5}
          >
            {rejecting ? <CircularProgress size={24} /> : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Journal Entry</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom sx={{ mt: 1 }}>
            Are you sure you want to delete this journal entry? This action cannot be undone.
          </Typography>
          {selectedEntry && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Entry #{selectedEntry.journal_entry_id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Date: {formatDate(selectedEntry.entry_date)}
              </Typography>
              {selectedEntry.description && (
                <Typography variant="body2" color="text.secondary">
                  Description: {selectedEntry.description}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={<DeleteIcon />}
          >
            {deleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
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

      {/* Edit Entry Dialog */}
      {selectedEntry && (
        <NewJournalEntryDialog
          open={editEntryOpen}
          onClose={() => {
            setEditEntryOpen(false);
            setSelectedEntry(null);
          }}
          onSuccess={handleEditSuccess}
          editMode={true}
          existingEntry={selectedEntry}
        />
      )}
    </Box>
  );
};

export default Journalize;
