'use client';
import React from 'react';
import { Box, Typography, Grid, Container } from '@mui/material';
import { Work, School } from '@mui/icons-material';
import { styled } from '@mui/system';
import AnimatedBox from '../components/AnimatedBox';

const experiences = [
  {
    duration: 'March 2024 - May 2024',
    title: 'Backend Engineer',
    company: 'Safaricom Ethiopia ',
    description: `Developed and maintained backend services for various applications using Spring and Spring Boot.
                  Implemented authentication and authorization using Keycloak, OAuth2, and JWT.
                  Built and managed microservices, ensuring high performance and reliability. Monitored and maintained system health using Grafana and Prometheus.`,
    icon: <Work />,
  },
  {
    duration: 'Feburary 2024 - July 2024',
    title: 'Full-stack Developer & UI/UX',
    company: 'Purpose Black Ethiopia ',
    description: `Developed and maintained full-stack applications using the MERN stack. Integrated RESTful APIs and front-end interfaces using React. Designed and implemented microservices architecture using Spring Boot and Node.js. Conducted code reviews and mentored junior developers, ensuring adherence to best practices and code quality.`,
    icon: <Work />,
  },
  {
    duration: 'October 2023 - April 2024',
    title: 'Advanced Software Engineering Trainee',
    company: 'Gebeya Inc',
    description: `Completed an intensive 6-month training program focused on advanced software engineering concepts. Worked on real-world projects, gaining hands-on experience with modern development practices. Enhanced skills in full-stack development, microservices architecture, and DevOps practices.`,
    icon: <Work />,
  },
  {
    duration: '2020 - present',
    title: 'Freelance Developer',
    company: 'Various Projects',
    description: `Worked on numerous freelance projects across different industries. Gained extensive experience in full-stack development, UI/UX design, and project management. Collaborated with clients to deliver high-quality solutions, meeting their specific needs and requirements.`,
    icon: <Work />,
  },
  {
    duration: '2018 - Present',
    title: 'Online Certifications',
    company: 'Udemy, LinkedIn Learning, SoloLearn, Udacity',
    description: `Acquired various certifications in advanced software development, machine learning, data science, and other technology-related fields. Continuous learning and upskilling through online courses from reputed platforms such as Udemy, LinkedIn Learning, SoloLearn, and Udacity.`,
    icon: <School />,
  },
];

const Header = styled(Box)(({ theme }) => ({
  width: '100%',
  padding: '2rem',
  position: 'relative',
  color: '#A3BFAA',
  marginTop: '5rem',
  marginBottom: '5rem',
  textAlign: 'center',
  '&::after': {
    content: '""',
    display: 'block',
    width: '100%',
    height: '2px',
    backgroundColor: '#454e56',
    marginTop: '1rem',
  },
}));

const ExperienceContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  width: '100%',
  maxWidth: '100%',
  display: 'grid',
  placeItems: 'center',
  backgroundColor: "#191d2b",
  color: '#fff',
  paddingBottom: '5rem',
}));

const ExperienceContent = styled(Container)(({ theme }) => ({
  width: '100%',
  color: '#fff',
  padding: 0,
}));

const ExperienceItem = styled(Box)(({ theme }) => ({
  position: 'relative',
  paddingLeft: '2rem',
  borderLeft: '1px solid grey',
  marginBottom: '2rem',
}));

const ExperienceIcon = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: '-25px',
  top: 0,
  backgroundColor: '#27AE60',
  width: '50px',
  height: '50px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '5px',
}));

const ExperienceDuration = styled(Typography)(({ theme }) => ({
  padding: '0.2rem 0.6rem',
  backgroundColor: '#191d2b',
  borderRadius: '15px',
  display: 'inline-block',
  textTransform: 'uppercase',
  fontWeight: '500',
  marginBottom: '0.5rem',
  color: '#fff',
}));

const ExperienceTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: '#beebd0',
  marginBottom: '0.5rem',
}));

const ExperienceDescription = styled(Typography)(({ theme }) => ({
  color: '#dbe1e8',
}));

const Experience = () => {
  return (
    <ExperienceContainer id="experience">
      <ExperienceContent>
        <Header>
          <Typography variant="h4">Experience</Typography>
        </Header>
        <Grid container spacing={4} style={{ marginLeft: "-20px" }}>
          {experiences.map((experience, index) => (
            <Grid item xs={12} md={6} key={index}>
              <ExperienceItem>
                <ExperienceIcon>
                  {experience.icon}
                </ExperienceIcon>
                <ExperienceDuration variant="body2">
                  {experience.duration}
                </ExperienceDuration>
                <ExperienceTitle variant="h6">
                  {experience.title}
                  {experience.company && (
                    <span style={{ color: '#fff', fontWeight: 500 }}>
                      {' '}
                      - {experience.company}
                    </span>
                  )}
                </ExperienceTitle>
                <AnimatedBox variant="slideInRight">
                  <ExperienceDescription variant="body2">
                    {experience.description}
                  </ExperienceDescription>
                </AnimatedBox>
              </ExperienceItem>
            </Grid>
          ))}
        </Grid>
      </ExperienceContent>
    </ExperienceContainer>
  );
};

export default Experience;
