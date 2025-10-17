import React from 'react';
import { Box, Typography } from '@mui/material';
import finkenLogo from '../assets/finken2.0logoTransparent.png';

const AuthHeader: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1, // Lowered z-index to be behind modals
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: { xs: 2, sm: 3 },
        background: 'transparent',
        pointerEvents: 'none', // Allow clicks to pass through
        minHeight: { xs: '120px', sm: '140px', md: '280px' }, // Increased height for large logo
      }}
    >
      {/* Centered Logo */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        textAlign: 'center',
        pointerEvents: 'auto', // Re-enable pointer events for the logo/title
        position: 'relative',
        mt: { xs: -1, sm: -1, md: -2 }, // Negative margin to move logo higher
      }}>
        <Box
          component="img"
          src={finkenLogo}
          alt="FinKen Logo"
          sx={{
            height: { xs: 80, sm: 100, md: 300 }, // Large logo as requested
            width: 'auto',
            filter: 'brightness(0) invert(1) drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.05)',
              filter: 'brightness(0) invert(1) drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
            },
            // Removed zIndex to inherit from parent
          }}
        />
      </Box>

      {/* Top Right Text */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 2, sm: 3 },
          right: { xs: 2, sm: 3 },
          pointerEvents: 'auto',
          textAlign: 'right',
          // Removed zIndex to inherit from parent
          padding: { xs: 2, sm: 3, md: 4 }, // Added padding for better spacing
        }}
      >
        <Typography 
          component="h1" 
          variant="h2" 
          sx={{ 
            fontFamily: '"Sansation", system-ui, sans-serif',
            fontWeight: 'bold', 
            color: 'white',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }, // Adjusted for top-right placement
            lineHeight: 1,
            letterSpacing: '0.02em',
            mb: 0.5,
          }}
        >
          FinKen 2.0
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: 'white',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' }, // Adjusted for top-right placement
            fontWeight: 400,
          }}
        >
          Financial Management System
        </Typography>
      </Box>
    </Box>
  );
};

export default AuthHeader;