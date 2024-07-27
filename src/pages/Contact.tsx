'use client'
import React from 'react';
import { Container, Grid, Typography, TextField, Button, Box, Link as MuiLink } from '@mui/material';
import { Email, Phone, LocationOn } from '@mui/icons-material';
import contactStyles from '@/styles/contactStyles';
import AnimatedBox from '../components/AnimatedBox';


const ContactPage: React.FC = () => {
  return (
    <Container style={{
      minHeight: '120vh',
      width: '100%',
      maxWidth: '100%',
      padding: 0,
      backgroundColor: '#191d2b',
      display: 'grid',
      placeItems: 'center',
      marginBottom: 10,
    }} id="contact">
      <Container sx={contactStyles.container}>
        <AnimatedBox variant="fadeInUp">
          <Typography variant="h4" sx={contactStyles.title}>
            Contact Me
          </Typography>
        </AnimatedBox>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Box sx={contactStyles.section}>
              <Typography variant="h6" sx={{ marginBottom: '1em', color: '#5dbb65' }}>Contact Information</Typography>
              <Box sx={contactStyles.contactItem}>
                <Email sx={contactStyles.contactIcon} />
                <Typography sx={contactStyles.contactInfo}>
                  <MuiLink href="mailto:email@domain.com" color="inherit">email@domain.com</MuiLink>
                </Typography>
              </Box>
              <Box sx={contactStyles.contactItem}>
                <Phone sx={contactStyles.contactIcon} />
                <Typography sx={contactStyles.contactInfo}>
                  <MuiLink href="tel:+123456789" color="inherit">+123 456 789</MuiLink>
                </Typography>
              </Box>
              <Box sx={contactStyles.contactItem}>
                <LocationOn sx={contactStyles.contactIcon} />
                <Typography sx={contactStyles.contactInfo}>
                  123 Main Street, City, Country
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={contactStyles.section}>
              <Typography variant="h6" sx={{ marginBottom: '1em', color: '#5dbb65' }}>Send Me a Message</Typography>
              <Box component="form" sx={contactStyles.form}>
                <TextField
                  label="Name"
                  variant="outlined"
                  sx={contactStyles.formField}
                  required
                  InputLabelProps={{
                    sx: contactStyles.labelField
                  }}
                />
                <TextField
                  label="Email"
                  variant="outlined"
                  sx={contactStyles.formField}
                  type="email"
                  required
                  InputLabelProps={{
                    sx: contactStyles.labelField
                  }}
                />
                <TextField
                  label="Subject"
                  variant="outlined"
                  sx={contactStyles.formField}
                  required
                  InputLabelProps={{
                    sx: contactStyles.labelField
                  }}
                />
                <TextField
                  label="Message"
                  variant="outlined"
                  sx={contactStyles.formField}
                  multiline
                  rows={4}
                  required
                  InputLabelProps={{
                    sx: contactStyles.labelField
                  }}
                />
                <Button type="submit" sx={contactStyles.submitButton}>
                  Send Message
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
        {/* Optionally, you can include a map here if you have a location to display */}
      </Container>
    </Container>
  );
};

export default ContactPage;
