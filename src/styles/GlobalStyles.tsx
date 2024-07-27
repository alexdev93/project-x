'use client'
import { GlobalStyles as GlobalStylesComponent } from '@mui/material';
import { css } from '@emotion/react';

const GlobalStyles = () => (
  <GlobalStylesComponent
    styles={css`
      * {
        padding-left: 0;
        padding-right: 0;
      }
    `}
  />
);

export default GlobalStyles;
