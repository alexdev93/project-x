'use client'
import { useTheme, useMediaQuery } from '@mui/material';

const useIsMobile = (): boolean => {
  const theme = useTheme(); // Get the theme object
  return useMediaQuery(theme.breakpoints.down('sm')); // Check if viewport matches 'sm' or below
};

export default useIsMobile;
