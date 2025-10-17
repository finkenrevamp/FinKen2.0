import React from 'react';
import { Box } from '@mui/material';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ children }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #001f3f 0%, #003366 25%, #004080 50%, #0066cc 75%, #1a8cff 100%)',
        '@keyframes underwater': {
          '0%': {
            opacity: 0.3,
            backgroundPosition: '20% 80%, 80% 20%, 40% 40%',
          },
          '33%': {
            opacity: 1,
            backgroundPosition: '60% 30%, 30% 70%, 80% 50%',
          },
          '66%': {
            opacity: 0.4,
            backgroundPosition: '40% 60%, 70% 40%, 20% 80%',
          },
          '100%': {
            opacity: 0.3,
            backgroundPosition: '20% 80%, 80% 20%, 40% 40%',
          },
        },
        '@keyframes underwater-reverse': {
          '0%': {
            opacity: 0.9,
            backgroundPosition: '60% 30%, 30% 70%',
          },
          '33%': {
            opacity: 0.2,
            backgroundPosition: '80% 80%, 10% 20%',
          },
          '66%': {
            opacity: 1,
            backgroundPosition: '30% 50%, 70% 60%',
          },
          '100%': {
            opacity: 0.9,
            backgroundPosition: '60% 30%, 30% 70%',
          },
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(0, 150, 255, 0.5) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0, 100, 200, 0.6) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(0, 200, 255, 0.4) 0%, transparent 50%)',
          backgroundSize: '100% 100%',
          animation: 'underwater 12s ease-in-out infinite',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 60% 30%, rgba(100, 200, 255, 0.4) 0%, transparent 60%), radial-gradient(circle at 30% 70%, rgba(0, 180, 255, 0.5) 0%, transparent 40%)',
          backgroundSize: '100% 100%',
          animation: 'underwater-reverse 10s ease-in-out infinite',
        },
      }}
    >
      {children}
    </Box>
  );
};

export default AnimatedBackground;
