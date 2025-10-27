import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import type { AccountData } from '../services/accountsService';
import { accountsService } from '../services/accountsService';
import { journalEntriesService, type JournalEntry } from '../services/journalEntriesService';

interface NewJournalEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editMode?: boolean;
  existingEntry?: JournalEntry;
}

interface EntryLine {
  id: string;
  account_id: number | '';
  type: 'Debit' | 'Credit';
  amount: string;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.jpg', '.jpeg', '.png'];

const NewJournalEntryDialog: React.FC<NewJournalEntryDialogProps> = ({
  open,
  onClose,
  onSuccess,
  editMode = false,
  existingEntry,
}) => {
  const [entryDate, setEntryDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState<string>('');
  const [isAdjustingEntry, setIsAdjustingEntry] = useState<boolean>(false);
  const [lines, setLines] = useState<EntryLine[]>([
    { id: '1', account_id: '', type: 'Debit', amount: '' },
    { id: '2', account_id: '', type: 'Credit', amount: '' },
  ]);
  const [files, setFiles] = useState<File[]>([]);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch accounts on mount
  useEffect(() => {
    if (open) {
      fetchAccounts();
    }
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (editMode && existingEntry && open) {
      setEntryDate(existingEntry.entry_date);
      setDescription(existingEntry.description || '');
      setIsAdjustingEntry(existingEntry.is_adjusting_entry);
      
      // Convert existing lines to the form format
      const formLines: EntryLine[] = existingEntry.lines.map((line, index) => ({
        id: `${line.line_id || index}`,
        account_id: line.account_id,
        type: line.type,
        amount: line.amount,
      }));
      setLines(formLines);
      
      // Note: We don't load existing files/attachments for editing
      // User can only add new attachments when editing
      setFiles([]);
    } else if (!editMode && open) {
      // Reset form for new entry
      setEntryDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setIsAdjustingEntry(false);
      setLines([
        { id: '1', account_id: '', type: 'Debit', amount: '' },
        { id: '2', account_id: '', type: 'Credit', amount: '' },
      ]);
      setFiles([]);
    }
  }, [editMode, existingEntry, open]);

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const accountsList = await accountsService.getAllAccounts({ is_active: true });
      setAccounts(accountsList);
    } catch (err: any) {
      console.error('Failed to fetch accounts:', err);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAddLine = (type: 'Debit' | 'Credit') => {
    const newLine: EntryLine = {
      id: Date.now().toString(),
      account_id: '',
      type,
      amount: '',
    };
    setLines([...lines, newLine]);
  };

  const handleRemoveLine = (id: string) => {
    // Ensure at least one debit and one credit line remain
    const debitCount = lines.filter((l) => l.type === 'Debit').length;
    const creditCount = lines.filter((l) => l.type === 'Credit').length;
    const lineToRemove = lines.find((l) => l.id === id);

    if (
      (lineToRemove?.type === 'Debit' && debitCount <= 1) ||
      (lineToRemove?.type === 'Credit' && creditCount <= 1)
    ) {
      setError('At least one debit and one credit line are required');
      return;
    }

    setLines(lines.filter((line) => line.id !== id));
  };

  const handleLineChange = (
    id: string,
    field: keyof EntryLine,
    value: string | number
  ) => {
    setLines(
      lines.map((line) =>
        line.id === id ? { ...line, [field]: value } : line
      )
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      
      // Validate file types
      const invalidFiles = selectedFiles.filter((file) => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return !ALLOWED_EXTENSIONS.includes(ext);
      });

      if (invalidFiles.length > 0) {
        setError(
          `Invalid file type(s). Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
        );
        return;
      }

      setFiles([...files, ...selectedFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const calculateTotals = () => {
    const totalDebit = lines
      .filter((line) => line.type === 'Debit')
      .reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);

    const totalCredit = lines
      .filter((line) => line.type === 'Credit')
      .reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);

    return { totalDebit, totalCredit };
  };

  const validateForm = (): string | null => {
    if (!entryDate) {
      return 'Entry date is required';
    }

    if (lines.length < 2) {
      return 'At least one debit and one credit line are required';
    }

    const hasDebit = lines.some((line) => line.type === 'Debit');
    const hasCredit = lines.some((line) => line.type === 'Credit');

    if (!hasDebit || !hasCredit) {
      return 'At least one debit and one credit line are required';
    }

    for (const line of lines) {
      if (!line.account_id) {
        return 'All lines must have an account selected';
      }
      if (!line.amount || parseFloat(line.amount) <= 0) {
        return 'All lines must have a valid amount greater than zero';
      }
    }

    const { totalDebit, totalCredit } = calculateTotals();
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return `Debits ($${totalDebit.toFixed(2)}) must equal credits ($${totalCredit.toFixed(2)})`;
    }

    return null;
  };

  const handleSubmit = async () => {
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const entryData = {
        entry_date: entryDate,
        description: description || undefined,
        is_adjusting_entry: isAdjustingEntry,
        lines: lines.map((line) => ({
          account_id: Number(line.account_id),
          type: line.type,
          amount: line.amount,
        })),
        files: files.length > 0 ? files : undefined,
      };

      if (editMode && existingEntry) {
        // Update existing entry
        await journalEntriesService.updateJournalEntry(
          existingEntry.journal_entry_id,
          entryData
        );
      } else {
        // Create new entry
        await journalEntriesService.createJournalEntry(entryData);
      }

      // Reset form
      setEntryDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setIsAdjustingEntry(false);
      setLines([
        { id: '1', account_id: '', type: 'Debit', amount: '' },
        { id: '2', account_id: '', type: 'Credit', amount: '' },
      ]);
      setFiles([]);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(`Failed to ${editMode ? 'update' : 'create'} journal entry:`, err);
      setError(err.message || `Failed to ${editMode ? 'update' : 'create'} journal entry`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEntryDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setIsAdjustingEntry(false);
    setLines([
      { id: '1', account_id: '', type: 'Debit', amount: '' },
      { id: '2', account_id: '', type: 'Credit', amount: '' },
    ]);
    setFiles([]);
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  const { totalDebit, totalCredit } = calculateTotals();
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5">
            {editMode ? `Edit Journal Entry #${existingEntry?.journal_entry_id}` : 'Create New Journal Entry'}
          </Typography>
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loadingAccounts ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Error Alert */}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Entry Information */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Entry Information
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="Entry Date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isAdjustingEntry}
                      onChange={(e) => setIsAdjustingEntry(e.target.checked)}
                    />
                  }
                  label="Adjusting Entry"
                />
              </Box>
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={2}
                sx={{ mt: 2 }}
                placeholder="Enter a description for this journal entry..."
              />
            </Box>

            {/* Account Lines */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Account Lines
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width="40%">Account</TableCell>
                      <TableCell width="15%">Type</TableCell>
                      <TableCell width="20%">Amount</TableCell>
                      <TableCell width="15%" align="right">
                        Debit
                      </TableCell>
                      <TableCell width="15%" align="right">
                        Credit
                      </TableCell>
                      <TableCell width="5%"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <TextField
                              select
                              value={line.account_id}
                              onChange={(e) =>
                                handleLineChange(line.id, 'account_id', Number(e.target.value))
                              }
                              fullWidth
                              size="small"
                              required
                            >
                              <MenuItem value="">
                                <em>Select an account</em>
                              </MenuItem>
                              {accounts.map((account) => (
                                <MenuItem key={account.account_id} value={account.account_id}>
                                  {account.account_number} - {account.account_name}
                                </MenuItem>
                              ))}
                            </TextField>
                          </TableCell>
                          <TableCell>{line.type}</TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={line.amount}
                              onChange={(e) =>
                                handleLineChange(line.id, 'amount', e.target.value)
                              }
                              fullWidth
                              size="small"
                              required
                              inputProps={{ min: 0, step: 0.01 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {line.type === 'Debit' && line.amount
                              ? `$${parseFloat(line.amount).toFixed(2)}`
                              : '-'}
                          </TableCell>
                          <TableCell align="right">
                            {line.type === 'Credit' && line.amount
                              ? `$${parseFloat(line.amount).toFixed(2)}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveLine(line.id)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: 'grey.50', fontWeight: 'bold' }}>
                      <TableCell colSpan={3}>
                        <strong>Total</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>${totalDebit.toFixed(2)}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>${totalCredit.toFixed(2)}</strong>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Balance Indicator */}
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                {totalDebit > 0 || totalCredit > 0 ? (
                  isBalanced ? (
                    <Chip label="Balanced ✓" color="success" size="small" />
                  ) : (
                    <Chip
                      label={`Out of balance by $${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
                      color="error"
                      size="small"
                    />
                  )
                ) : null}
              </Box>

              {/* Add Line Buttons */}
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => handleAddLine('Debit')}
                  variant="outlined"
                  size="small"
                >
                  Add Debit Line
                </Button>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => handleAddLine('Credit')}
                  variant="outlined"
                  size="small"
                >
                  Add Credit Line
                </Button>
              </Box>
            </Box>

            {/* File Attachments */}
            <Box>
              <Typography variant="h6" gutterBottom>
                {editMode ? 'Add New Attachments (Optional)' : 'Attachments (Optional)'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Allowed file types: PDF, Word, Excel, CSV, JPG, PNG
                {editMode && ' (Existing attachments will be preserved)'}
              </Typography>

              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
                sx={{ mt: 1 }}
              >
                Add Files
                <input
                  type="file"
                  hidden
                  multiple
                  accept={ALLOWED_EXTENSIONS.join(',')}
                  onChange={handleFileChange}
                />
              </Button>

              {files.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {files.map((file, index) => (
                    <Chip
                      key={index}
                      label={`${file.name} (${formatFileSize(file.size)})`}
                      onDelete={() => handleRemoveFile(index)}
                      sx={{ mr: 1, mb: 1 }}
                      icon={<AttachFileIcon />}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'space-between' }}>
          {!editMode && (
            <Button onClick={handleReset} disabled={loading || loadingAccounts} color="warning">
              Reset Form
            </Button>
          )}
          {editMode && <Box />}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading || loadingAccounts || !isBalanced}
            >
              {loading ? <CircularProgress size={24} /> : editMode ? 'Update Entry' : 'Create Entry'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default NewJournalEntryDialog;
