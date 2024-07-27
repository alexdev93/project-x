'use client'
import { SxProps, Theme } from '@mui/material/styles';

const skillsStyles = (theme: Theme): Record<string, SxProps<Theme>> => ({
  aboutStats: {
    paddingBottom: '4rem',
  },
  statTitle: {
    textTransform: 'uppercase',
    fontSize: '1.8rem',
    textAlign: 'center',
    padding: '3.5rem 0',
    color: '#fff',
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: '50%',
      top: 0,
      width: '40%',
      height: '1px',
      backgroundColor: theme.palette.grey[500],
      transform: 'translateX(-50%)',
    },
  },
  progressBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  progressBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  progTitle: {
    textTransform: 'uppercase',
    fontWeight: 500,
  },
  progressCon: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  progressText: {
    color: theme.palette.grey[600],
  },
  progress: {
    flexGrow: 1,
    height: '1rem',
    backgroundColor: theme.palette.grey[300],
    borderRadius: '0.5rem',
    overflow: 'hidden',
    position: 'relative',
  },
  progressInner: {
    height: '100%',
    transition: 'width 0.4s ease-in-out',
    borderRadius: '0.5rem',
  },
});

export default skillsStyles;
