import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  AccountCircle,
  ExitToApp,
  PhotoCamera,
  ArrowDropDown,
  People,
  PersonAdd,
  VpnKey,
  Create,
  AccountTree,
  History,
  Assessment,
} from '@mui/icons-material';
import type { User } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import finkenLogo from '../assets/finken2.0logoTransparent.png';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { user: contextUser, updateProfileImage } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [adminMenuAnchor, setAdminMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [reportsMenuAnchor, setReportsMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Use profile image from context (updates in real-time) or fall back to prop
  const currentProfileImage = contextUser?.profileImage || user.profileImage;
  
  // Debug logging
  console.log('Header render - contextUser?.profileImage:', contextUser?.profileImage);
  console.log('Header render - user.profileImage:', user.profileImage);
  console.log('Header render - currentProfileImage:', currentProfileImage);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAdminMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAdminMenuAnchor(event.currentTarget);
  };

  const handleAdminMenuClose = () => {
    setAdminMenuAnchor(null);
  };

  const handleReportsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setReportsMenuAnchor(event.currentTarget);
  };

  const handleReportsMenuClose = () => {
    setReportsMenuAnchor(null);
  };

  const handleAdminNavigation = (path: string) => {
    handleAdminMenuClose();
    navigate(path);
  };

  const handleReportsNavigation = (path: string) => {
    handleReportsMenuClose();
    navigate(path);
  };

  const handleUploadClick = () => {
    handleProfileMenuClose();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setSnackbar({
        open: true,
        message: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)',
        severity: 'error',
      });
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setSnackbar({
        open: true,
        message: 'Image size must be less than 5MB',
        severity: 'error',
      });
      return;
    }

    setUploading(true);
    try {
      const result = await profileService.uploadProfilePicture(file);
      console.log('Upload result:', result);
      console.log('Profile picture URL:', result.profile_picture_url);
      setSnackbar({
        open: true,
        message: 'Profile picture uploaded successfully!',
        severity: 'success',
      });
      // Update the user profile image in auth context
      updateProfileImage(result.profile_picture_url);
      console.log('Updated profile image in context');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to upload profile picture',
        severity: 'error',
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    onLogout();
    navigate('/sign-in');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrator':
        return 'error';
      case 'Manager':
        return 'warning';
      case 'Accountant':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatRole = (role: string) => {
    return role; // Role is already properly capitalized
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={4}
      sx={{
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        width: '100%',
        zIndex: 1100,
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 4 } }}>
        {/* Logo and App Name */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mr: 4,
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.02)',
              opacity: 0.9,
            },
          }}
          onClick={() => navigate('/home')}
        >
          <Box
            component="img"
            src={finkenLogo}
            alt="FinKen Logo"
            sx={{
              height: 65,
              width: 'auto',
              mr: 2,
              filter: 'brightness(0) invert(1)', // Makes the logo white
            }}
          />
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ 
              fontFamily: '"Sansation", system-ui, sans-serif',
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #ffffff 30%, #e3f2fd 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.5px',
            }}
          >
            FinKen 2.0
          </Typography>
        </Box>

        {/* Navigation Menu */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
          {/* Journalize Button */}
          <Button
            color="inherit"
            onClick={() => navigate('/journalize')}
            startIcon={<Create />}
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            Journalize
          </Button>

          {/* Chart of Accounts Button */}
          <Button
            color="inherit"
            onClick={() => navigate('/chart-of-accounts')}
            startIcon={<AccountTree />}
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            Chart of Accounts
          </Button>

          {/* Event Logs Button */}
          <Button
            color="inherit"
            onClick={() => navigate('/event-logs')}
            startIcon={<History />}
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            Event Logs
          </Button>

          {/* Reports Dropdown */}
          <Button
            color="inherit"
            onClick={handleReportsMenuOpen}
            endIcon={<ArrowDropDown />}
            startIcon={<Assessment />}
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            Reports
          </Button>
          <Menu
            id="reports-menu"
            anchorEl={reportsMenuAnchor}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            open={Boolean(reportsMenuAnchor)}
            onClose={handleReportsMenuClose}
            sx={{
              '& .MuiPaper-root': {
                mt: 1,
                borderRadius: 2,
                minWidth: 200,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
              },
            }}
          >
            <MenuItem 
              onClick={() => handleReportsNavigation('/trial-balance')}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                },
              }}
            >
              Trial Balance
            </MenuItem>
            <MenuItem 
              onClick={() => handleReportsNavigation('/income-statement')}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                },
              }}
            >
              Income Statement
            </MenuItem>
            <MenuItem 
              onClick={() => handleReportsNavigation('/retained-earnings')}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                },
              }}
            >
              Retained Earnings
            </MenuItem>
            <MenuItem 
              onClick={() => handleReportsNavigation('/balance-sheet')}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                },
              }}
            >
              Balance Sheet
            </MenuItem>
          </Menu>

          {/* Admin Utilities (Admin only) */}
          {user.role === 'Administrator' && (
            <>
              <Button
                color="inherit"
                onClick={handleAdminMenuOpen}
                endIcon={<ArrowDropDown />}
                sx={{ 
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 3,
                  backgroundColor: 'rgba(100, 181, 246, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(100, 181, 246, 0.5)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                Admin Utilities
              </Button>
              <Menu
                id="admin-menu"
                anchorEl={adminMenuAnchor}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                open={Boolean(adminMenuAnchor)}
                onClose={handleAdminMenuClose}
                sx={{
                  '& .MuiPaper-root': {
                    mt: 1,
                    borderRadius: 2,
                    minWidth: 200,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                    backdropFilter: 'blur(10px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  },
                }}
              >
                <MenuItem 
                  onClick={() => handleAdminNavigation('/users')}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    },
                  }}
                >
                  <People sx={{ mr: 1 }} />
                  Users
                </MenuItem>
                <MenuItem 
                  onClick={() => handleAdminNavigation('/registrations')}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    },
                  }}
                >
                  <PersonAdd sx={{ mr: 1 }} />
                  Registrations
                </MenuItem>
                <MenuItem 
                  onClick={() => handleAdminNavigation('/expiring-passwords')}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    },
                  }}
                >
                  <VpnKey sx={{ mr: 1 }} />
                  Expiring Passwords
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        {/* User Info and Profile Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* User Role Badge */}
          <Chip
            label={formatRole(user.role)}
            color={getRoleColor(user.role)}
            size="small"
            variant="outlined"
            sx={{ 
              color: 'white', 
              borderColor: 'rgba(255, 255, 255, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              '& .MuiChip-label': { 
                color: 'white',
                fontWeight: 'medium',
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          />

          {/* User Name */}
          <Typography 
            variant="body1" 
            sx={{ 
              mr: 1,
              fontWeight: 'medium',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
            }}
          >
            {user.firstName} {user.lastName}
          </Typography>

          {/* Profile Avatar and Menu */}
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="profile-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
            sx={{
              border: '2px solid rgba(255, 255, 255, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {currentProfileImage ? (
              <Avatar
                src={currentProfileImage}
                alt={`${user.firstName} ${user.lastName}`}
                sx={{ width: 32, height: 32 }}
              />
            ) : (
              <AccountCircle sx={{ fontSize: 32 }} />
            )}
          </IconButton>

          <Menu
            id="profile-menu"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            sx={{
              '& .MuiPaper-root': {
                mt: 1,
                borderRadius: 2,
                minWidth: 180,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
              },
            }}
          >
            <MenuItem 
              onClick={handleUploadClick}
              disabled={uploading}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                },
              }}
            >
              {uploading ? (
                <CircularProgress size={20} sx={{ mr: 1 }} />
              ) : (
                <PhotoCamera sx={{ mr: 1 }} />
              )}
              {uploading ? 'Uploading...' : 'Upload Profile Picture'}
            </MenuItem>
            <MenuItem 
              onClick={handleLogout}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(220, 0, 78, 0.1)',
                },
              }}
            >
              <ExitToApp sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>

          {/* Hidden file input for profile picture upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
          />
        </Box>
      </Toolbar>

      {/* Snackbar for upload feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppBar>
  );
};

export default Header;