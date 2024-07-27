'use client'
import React from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, Container } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import aboutMeStyles from '../styles/aboutMeStyles';
import AnimatedBox from '../components/AnimatedBox';
import Counter from '../components/Counter';
import useIsMobile from '../utils/mediaQueries';


const AboutMe = () => {
  const isMobile = useIsMobile();
  const classes = aboutMeStyles(isMobile);
  return (
    <Container style={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100%',
      padding: 20,
      backgroundColor: '#191d2b',
      display: 'grid',
      placeItems: 'center'
    }}>
      <Box sx={classes.aboutSection}>
        <Box sx={classes.mainTitle}>
          <Typography variant="h2">
            About me
          </Typography>
        </Box>
        <Grid container spacing={4} sx={classes.aboutContainer}>
          <Grid item xs={12} md={6}>
            <Box sx={classes.leftAbout}>
              <AnimatedBox variant="fadeInUp">
                <Typography variant="h4">Information About Me</Typography>
              </AnimatedBox>
              <AnimatedBox variant="slideInLeft">
                <Typography variant="body1" sx={classes.paragraph}>
                  In addition to my technical skills, I am committed to continuous learning and growth. I stay
                  up-to-date with the latest trends and best practices in web development by attending
                  conferences, participating in online communities, and reading industry publications.
                </Typography>
              </AnimatedBox>
              <AnimatedBox variant="slideInLeft">
                <Typography variant="body1" sx={classes.paragraph}>
                  I enjoy exploring new technologies and working on personal projects outside of work.
                  Additionally, I volunteer my time to help non-profit organizations with their web
                  development needs. Giving back to the community is a rewarding way for me to apply my skills
                  and make a positive impact on the world.
                </Typography>
              </AnimatedBox>
              <Box sx={classes.btnContainer}>
                <Button
                  style={{ backgroundColor: '#9BF2EA', color: '#260101' }}
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  href="./ALEMAYEHU_MEKONEN[RESUME].pdf"
                >
                  Download CV
                </Button>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              {[
                { value: '10', label: 'Projects Completed' },
                { value: '4', label: 'Years of experience' },
                { value: '30', label: 'Happy Clients' },
                { value: '40', label: 'Customer reviews' },
              ].map((item, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Card sx={classes.card}>
                    <CardContent sx={classes.cardContent}>
                      <Counter targetNumber={parseInt(item.value)} largeText={classes.largeText} />
                      <AnimatedBox variant="fadeInUp">
                        <Typography variant="body1" sx={classes.smallText}>
                          {item.label}
                        </Typography>
                      </AnimatedBox>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default AboutMe;
