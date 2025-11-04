import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
} from '@mui/material';
import { Email } from '@mui/icons-material';
import { profileService, type UserData } from '../services/profileService';

interface EmailButtonProps {
  buttonText?: string;
  position?: 'absolute' | 'relative';
  top?: number | string;
  right?: number | string;
}

const EmailButton: React.FC<EmailButtonProps> = ({ 
  buttonText = 'Email',
  position = 'relative',
  top,
  right,
}) => {
  // Email dialog state
  const [emailDialog, setEmailDialog] = useState<{
    open: boolean;
    recipients: UserData[];
    selectedUserId: string;
    subject: string;
    body: string;
    loading: boolean;
    loadingRecipients: boolean;
  }>({
    open: false,
    recipients: [],
    selectedUserId: '',
    subject: '',
    body: '',
    loading: false,
    loadingRecipients: false,
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch admins and managers for email recipients
  const fetchEmailRecipients = useCallback(async () => {
    try {
      setEmailDialog((prev) => ({ ...prev, loadingRecipients: true }));
      const allUsers = await profileService.getAllUsers();
      // Filter for only active admins and managers
      const recipients = allUsers.filter(
        (u) => u.is_active && !u.is_suspended && 
        (u.role_name === 'Administrator' || u.role_name === 'Manager')
      );
      setEmailDialog((prev) => ({ ...prev, recipients, loadingRecipients: false }));
    } catch (err: any) {
      console.error('Failed to fetch email recipients:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Failed to load email recipients',
        severity: 'error',
      });
      setEmailDialog((prev) => ({ ...prev, loadingRecipients: false }));
    }
  }, []);

  // Email handlers
  const handleOpenEmailDialog = () => {
    setEmailDialog({
      open: true,
      recipients: [],
      selectedUserId: '',
      subject: '',
      body: '',
      loading: false,
      loadingRecipients: false,
    });
    fetchEmailRecipients();
  };

  const handleEmailSubmit = async () => {
    if (!emailDialog.selectedUserId) return;

    try {
      setEmailDialog((prev) => ({ ...prev, loading: true }));
      await profileService.sendEmailToUser(emailDialog.selectedUserId, {
        subject: emailDialog.subject,
        body: emailDialog.body,
      });
      setSnackbar({
        open: true,
        message: 'Email sent successfully',
        severity: 'success',
      });
      setEmailDialog({
        open: false,
        recipients: [],
        selectedUserId: '',
        subject: '',
        body: '',
        loading: false,
        loadingRecipients: false,
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to send email',
        severity: 'error',
      });
      setEmailDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const boxStyles = position === 'absolute' 
    ? { position, top, right, zIndex: 1 }
    : {};

  return (
    <>
      <Box sx={boxStyles}>
        <Tooltip title="Email Admin/Manager">
          <Button
            variant="contained"
            color="primary"
            startIcon={<Email />}
            onClick={handleOpenEmailDialog}
            sx={{ height: 'fit-content' }}
          >
            {buttonText}
          </Button>
        </Tooltip>
      </Box>

      {/* Email Dialog */}
      <Dialog 
        open={emailDialog.open} 
        onClose={() => !emailDialog.loading && setEmailDialog({
          open: false,
          recipients: [],
          selectedUserId: '',
          subject: '',
          body: '',
          loading: false,
          loadingRecipients: false,
        })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Email Admin or Manager</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Recipient"
              select
              value={emailDialog.selectedUserId}
              onChange={(e) => setEmailDialog((prev) => ({ ...prev, selectedUserId: e.target.value }))}
              fullWidth
              required
              disabled={emailDialog.loadingRecipients}
              helperText={emailDialog.loadingRecipients ? 'Loading recipients...' : 'Select an admin or manager to email'}
            >
              {emailDialog.recipients.length === 0 && !emailDialog.loadingRecipients && (
                <MenuItem value="" disabled>
                  No admins or managers available
                </MenuItem>
              )}
              {emailDialog.recipients.map((recipient) => (
                <MenuItem key={recipient.id} value={recipient.id}>
                  {recipient.first_name} {recipient.last_name} ({recipient.role_name}) - {recipient.email}
                </MenuItem>
              ))}
            </TextField>
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
          <Button 
            onClick={() => setEmailDialog({
              open: false,
              recipients: [],
              selectedUserId: '',
              subject: '',
              body: '',
              loading: false,
              loadingRecipients: false,
            })} 
            disabled={emailDialog.loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleEmailSubmit} 
            variant="contained" 
            disabled={emailDialog.loading || !emailDialog.selectedUserId || !emailDialog.subject || !emailDialog.body}
          >
            {emailDialog.loading ? <CircularProgress size={24} /> : 'Send Email'}
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
    </>
  );
};

export default EmailButton;
