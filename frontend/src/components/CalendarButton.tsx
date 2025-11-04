import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';

interface CalendarButtonProps {
  position?: 'absolute' | 'relative';
  top?: number | string;
  left?: number | string;
}

const CalendarButton: React.FC<CalendarButtonProps> = ({ 
  position = 'absolute', 
  top = 80, 
  left = 20 
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());

  return (
    <>
      <Box sx={{ position, top, left, zIndex: 1 }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<CalendarMonthIcon />}
          onClick={() => setCalendarOpen(true)}
          sx={{ 
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              boxShadow: 4,
            }
          }}
        >
          {selectedCalendarDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </Button>
      </Box>

      {/* Calendar Popup Dialog */}
      <Dialog
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonthIcon />
            <Typography variant="h6">Calendar</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateCalendar
              value={selectedCalendarDate}
              onChange={(newDate) => {
                if (newDate) {
                  setSelectedCalendarDate(newDate);
                }
              }}
              sx={{
                '& .MuiPickersDay-root': {
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                  },
                },
              }}
            />
          </LocalizationProvider>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Selected Date:
            </Typography>
            <Typography variant="h6">
              {selectedCalendarDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedCalendarDate(new Date())}>
            Today
          </Button>
          <Button onClick={() => setCalendarOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CalendarButton;
