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
} from '@mui/material';
import {
  AccountCircle,
  ExitToApp,
  Settings,
} from '@mui/icons-material';
import type { User } from '../types/auth';
import finkenLogo from '../assets/finken2.0logoTransparent.png';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
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
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
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
          {user.role === 'Administrator' && (
            <>
              <Button
                color="inherit"
                onClick={() => navigate('/users')}
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
                Users
              </Button>
              <Button
                color="inherit"
                onClick={() => navigate('/registrations')}
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
                Registrations
              </Button>
              <Button
                color="inherit"
                onClick={() => navigate('/expiring-passwords')}
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
                Expiring Passwords
              </Button>
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
            {user.profileImage ? (
              <Avatar
                src={user.profileImage}
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
              onClick={handleProfileMenuClose}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                },
              }}
            >
              <Settings sx={{ mr: 1 }} />
              Profile Settings
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
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;