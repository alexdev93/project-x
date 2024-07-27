'use client'
import React from 'react';
import { Box, Typography, Grid, Container } from '@mui/material';
import skillsStyles from '../styles/skillStyles';
import { useTheme } from '@mui/material/styles';
import AnimatedBox from '../components/AnimatedBox';

const skills = [
  { title: 'Spring Boot:', width: '95%', color: '#6DB33F' },
  { title: 'NextJs', width: '90%', color: '#000' },
  { title: 'NodeJs', width: '95%', color: ' #8CC84B' },
  { title: 'TypeScript', width: '90%', color: '#007ACC' },
  { title: 'ReactJS', width: '95%', color: '#61DAFB' },
  { title: 'NestJS', width: '97%', color: '#000' },
  { title: 'Java', width: '92%', color: '#007396' },
  { title: 'JavaScript', width: '100%', color: '#F7DF1E' },
];

const Skills = () => {

  const theme = useTheme();
  const classes = skillsStyles(theme);

  return (
    <Container style={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100%',
      padding: 0,
      color: '#fff',
      backgroundColor: '#191d2b',
      display: 'grid',
      placeItems: 'center'
    }} id="skills">
      <Container style={{ width: '80%' }}>
        <Box sx={classes.aboutStats}>
          <Typography variant="h4" sx={classes.statTitle}>My Skills</Typography>
          <Grid container spacing={4} sx={classes.progressBars}>
            {skills.map((skill, index) => (
              <Grid item xs={12} key={index}>
                <Box sx={classes.progressBar}>
                  <Typography variant="body1" sx={classes.progTitle}>{skill.title}</Typography>
                  <AnimatedBox variant="slideInLeft">
                    <Box sx={classes.progressCon}>
                      <Box sx={classes.progress}>
                        <Box sx={{ ...classes.progressInner, width: skill.width, backgroundColor: skill.color }} />
                      </Box>
                      <Typography variant="body2" sx={classes.progText}>{skill.width}</Typography>
                    </Box>
                  </AnimatedBox>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </Container >
  );
};

export default Skills;
