'use client'
import { SxProps, Theme } from '@mui/material/styles';
import createCustomTheme from './../theme';

const theme = createCustomTheme();

const aboutMeStyles = (isMobile: boolean): Record<string, SxProps<Theme>> => ({

  aboutSection: {
    padding: isMobile ? 0 : '2em',
    color: theme.palette.secondary.main,
    width: isMobile ? '100%' : '90%',
  },
  mainTitle: {
    marginBottom: '3.5rem',

    '& h2': {
      fontSize: '2.5rem',
      fontWeight: 'bold',

      '& span': {
        color: theme.palette.secondary.main,
      },

      '& .bgText': {
        display: 'block',
        fontSize: '4rem',
        opacity: 0.1,
      },
    },
  },
  aboutContainer: {
    paddingBottom: isMobile ? '5rem' : '',
    width: '100%',
    diplay: 'grid',
    placeItems: 'center',
    marginLeft: isMobile ? -2 : '',
  },
  leftAbout: {
    padding: '1rem',
    marginBottom: isMobile ? '2rem' : '',
    '& h4': {
      fontSize: '2rem',
      textTransform: 'uppercase',
      marginBottom: '1rem',
    },
  },
  paragraph: {
    letterSpacing: '1.5px',
    lineHeight: 1.5,
    marginBottom: '1rem',
    color: theme.palette.common.white,
  },
  btnContainer: {
    marginTop: '2rem',
  },
  card: {
    backgroundColor: theme.palette.grey[500],
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '5px',
    transition: 'all 0.4s ease-in-out',
    boxShadow: '1px 2px 15px rgba(0, 0, 0, 0.1)',

    '&:hover': {
      cursor: 'default',
      transform: 'translateY(-5px)',
      border: `1px solid ${theme.palette.secondary.main}`,
      boxShadow: '1px 4px 15px rgba(0, 0, 0, 0.32)',
    },
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  largeText: {
    fontSize: '3rem',
    fontWeight: 700,
    color: theme.palette.secondary.main,
    marginBottom: '0.5rem',
  },
  smallText: {
    fontSize: '1.2rem',
    color: '#9BF2EA',
    textTransform: 'uppercase',
  },
  highlight: {
    color: theme.palette.secondary.main,
  },
  bgText: {
    display: 'block',
    fontSize: '4rem',
    opacity: 0.1,
  },
});

export default aboutMeStyles;
