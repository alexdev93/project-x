import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { Grid } from '@mui/material';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <html lang="en">
      <body >
          <CssBaseline />

        <Grid style={{ minHeight: '100vh', width: '100%', maxWidth: '100%', padding: 0, backgroundColor: '#191d2b', overflow: 'hidden' }}>
          {children}
        </Grid>
      </body>
    </html>
  );
};

export default Layout;
