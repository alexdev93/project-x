// components/Footer.tsx

import React from 'react';
import { Container, Grid, Typography, Link as MuiLink, Box } from '@mui/material';
import { Facebook, Twitter, LinkedIn, Pinterest, Google } from '@mui/icons-material';
import { SxProps, Theme } from '@mui/material/styles';

const footerStyles: Record<string, SxProps<Theme>> = {
  footer: {
    backgroundColor: '#141618',
    width: '100%',
    padding: '2rem',
    color: '#e6e8ea',
    marginBottom: '2reem',
  },
  container: {
    padding: '20px',
  },
  sectionTitle: {
    color: '#27AE60',
  },
  link: {
    color: '#afb1b4',
  },
  subFooter: {
    backgroundColor: '#141618',
    padding: '50px 0',
    gap: '10px',
  },
  socialLinks: {
    color: '#e6e8ea',
    margin: '0 5px',
  },
};

const Footer: React.FC = () => {
  return (
    <Box component="footer" sx={footerStyles.footer} >
      <Container sx={footerStyles.container}>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={3}>
            <div>
              <Typography variant="h6" sx={footerStyles.sectionTitle}>Our Contact</Typography>
              <address>
                <strong>Hi-Tech Inc</strong><br />
                JC Main Road, Near Silnile tower<br />
                Pin-21542 NewYork US.
              </address>
              <Typography>
                <i className="icon-phone" /> (123) 456-789 - 1255-12584 <br />
                <i className="icon-envelope-alt" /> email@domainname.com
              </Typography>
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <div>
              <Typography variant="h6" sx={footerStyles.sectionTitle}>Quick Links</Typography>
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                <li><MuiLink href="#" sx={footerStyles.link}>Latest Events</MuiLink></li>
                <li><MuiLink href="#" sx={footerStyles.link}>Terms and Conditions</MuiLink></li>
                <li><MuiLink href="#" sx={footerStyles.link}>Privacy Policy</MuiLink></li>
                <li><MuiLink href="#" sx={footerStyles.link}>Career</MuiLink></li>
                <li><MuiLink href="#" sx={footerStyles.link}>Contact Us</MuiLink></li>
              </ul>
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <div>
              <Typography variant="h6" sx={footerStyles.sectionTitle}>Latest Posts</Typography>
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                <li><MuiLink href="#" sx={footerStyles.link}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</MuiLink></li>
                <li><MuiLink href="#" sx={footerStyles.link}>Pellentesque et pulvinar enim. Quisque at tempor ligula</MuiLink></li>
                <li><MuiLink href="#" sx={footerStyles.link}>Natus error sit voluptatem accusantium doloremque</MuiLink></li>
              </ul>
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <div>
              <Typography variant="h6" sx={footerStyles.sectionTitle}>Recent News</Typography>
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                <li><MuiLink href="#" sx={footerStyles.link}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</MuiLink></li>
                <li><MuiLink href="#" sx={footerStyles.link}>Pellentesque et pulvinar enim. Quisque at tempor ligula</MuiLink></li>
                <li><MuiLink href="#" sx={footerStyles.link}>Natus error sit voluptatem accusantium doloremque</MuiLink></li>
              </ul>
            </div>
          </Grid>
        </Grid>
      </Container>
      <Box id="sub-footer" sx={footerStyles.subFooter}>
        <Container>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item>
              <Typography sx={{ color: '#e6e8ea' }}>
                <span>© Hi-Tech 2016 All rights reserved. By </span>
                <MuiLink href="http://webthemez.com" target="_blank" sx={footerStyles.link}>WebThemez</MuiLink>
              </Typography>
            </Grid>
            <Grid item>
              <div>
                <MuiLink href="#" title="Facebook" sx={footerStyles.socialLinks}><Facebook /></MuiLink>
                <MuiLink href="#" title="Twitter" sx={footerStyles.socialLinks}><Twitter /></MuiLink>
                <MuiLink href="#" title="LinkedIn" sx={footerStyles.socialLinks}><LinkedIn /></MuiLink>
                <MuiLink href="#" title="Pinterest" sx={footerStyles.socialLinks}><Pinterest /></MuiLink>
                <MuiLink href="#" title="Google" sx={footerStyles.socialLinks}><Google /></MuiLink>
              </div>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Footer;
