// src/styles/contactStyles.ts

import { SxProps, Theme } from '@mui/material/styles';
import createCustomTheme from './../theme';

// Get theme values
const theme = createCustomTheme();

const contactStyles: Record<string, SxProps<Theme>> = {
  container: {
    padding: '2em',
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
  },
  title: {
    marginBottom: '2em',
    textAlign: 'center',
    fontWeight: 'bold',
    color: theme.palette.secondary.main,
  },
  section: {
    marginBottom: '2em',
  },
  contactInfo: {
    color: theme.palette.common.white,
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1em',
    color: theme.palette.common.white,
  },
  contactIcon: {
    marginRight: '0.5em',
    color: theme.palette.common.white,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1em',
    color: '#fff',
  },
  formField: {
    width: '100%',
    color: '#fff',
    '& .MuiInputBase-input': {
      color: '#ffffff', // Input text color
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        border: '0.5px solid ',
        borderColor: '#799c81',
        color: theme.palette.common.white,
      },
      '&:hover fieldset': {
        borderColor: theme.palette.grey[500],
        color: theme.palette.common.white,
      },
      '&.Mui-focused fieldset': {
        borderColor: theme.palette.secondary.main,
        color: theme.palette.common.white,
      },
    },
  },
  labelField: {
    color: '#799c81',
    '&.Mui-focused': {
      color: theme.palette.secondary.main,
    },
  },
  submitButton: {
    alignSelf: 'flex-start',
    backgroundColor: theme.palette.secondary.main,
    color: theme.palette.common.white,
    '&:hover': {
      backgroundColor: theme.palette.secondary.dark, // Use a darker shade from the secondary palette if available
    },
  },
};

export default contactStyles;
