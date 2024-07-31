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
    }} id="about">
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
                Hi, I’m Alemayehu Mekonen, a dedicated software developer 
                with a strong background in computer science and hands-on 
                experience from various projects and internships, 
                including Safaricom. I am certified in Spring Boot and 
                have undergone training at Gebeya, which has honed my 
                backend skills. I specialize in web development with 
                expertise in Spring Boot, NestJS, and general backend solutions.
                </Typography>
              </AnimatedBox>
              <AnimatedBox variant="slideInLeft">
                <Typography variant="body1" sx={classes.paragraph}>
                Currently, I am enhancing my portfolio with Next.js and Material-UI to achieve 
                a clean, professional look. My work integrates backend engineering, frontend 
                development, UI/UX design, and full-stack solutions, providing comprehensive 
                and high-quality software solutions tailored to meet client needs and improve 
                their digital presence.
                </Typography>
              </AnimatedBox>
              <Box sx={classes.btnContainer}>
                <Button
                  style={{ backgroundColor: '#9BF2EA', color: '#260101' }}
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  href="./Alemayehu Mekonen Full-Stack Software Developer CV Resume.pdf"
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
