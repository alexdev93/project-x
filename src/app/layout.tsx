import React from 'react';
import type { Metadata } from 'next';
import CssBaseline from '@mui/material/CssBaseline';
import { Grid } from '@mui/material';

export const metadata: Metadata = {
  title: 'Alex Tesfaye | Full-Stack & DevOps Engineer',
  description:
    'Portfolio of Alex Tesfaye, a versatile Full-Stack and DevOps Engineer specializing in Spring Boot, Node.js, Docker, and Kubernetes.',
};

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
