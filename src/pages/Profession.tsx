'use client'
import React from 'react';
import { Typography, Grid, Card, CardContent } from '@mui/material';
import { offeringsStyles } from '../styles/professionsStyles';
import styled from '@emotion/styled';
import AnimatedBox from '../components/AnimatedBox';
import useIsMobile from '../utils/mediaQueries';

const Section = styled.section`
  ${offeringsStyles.section}
`;

const Subtitle = styled(Typography)`
  ${offeringsStyles.subtitle}
`;

const Heading = styled(Typography)`
  ${offeringsStyles.heading}
`;

const TitleTypo = styled(Typography)`
  ${offeringsStyles.cardTitle}
`;

const Desciption = styled(Typography)`
  ${offeringsStyles.cardDescription}
`;

const Circle = styled.div<{ img: string; index: number; ismobile: boolean }>`
  ${({ img, index, ismobile: isMobile }) => offeringsStyles.circle(img, index, isMobile)}
`;

const StyledCard = styled(Card)`
  ${offeringsStyles.card}
`;

const StyledGrid = styled(Grid)<{ isMobile: boolean }>`
${({ isMobile }) => offeringsStyles.grid( isMobile)}
`;

const CardContentWrapper = styled(CardContent) <{ index: number }>`
  ${({ index }) => offeringsStyles.cardContent(index)}
`;

const Profession: React.FC = () => {
  const isMobile = useIsMobile();
  return (
    <Section id="about">
      <Subtitle variant="subtitle1">
        what we&apos;re offering
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          style={offeringsStyles.svg}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
          />
        </svg>
      </Subtitle>
      <Heading variant="h1">
        Services Built Specifically for your Business
      </Heading>
      <StyledGrid container spacing={3} isMobile={isMobile}>
        {[
          {
            varient: "fadeInLeft",
            title: 'UI/UX creative design',
            description:
              'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames.',
            img: 'https://images.unsplash.com/photo-1587440871875-191322ee64b0?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          },
          {
            varient: "fadeInRight",
            title: 'visual graphic design',
            description:
              'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames.',
            img: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          },
          {
            varient: "fadeInUp",
            title: 'strategy & digital marketing',
            description:
              'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames.',
            img: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          },
          {
            varient: "fadeInDown",
            title: 'effective business growth',
            description:
              'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames.',
            img: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          },
        ].map((offer, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <StyledCard>
              <AnimatedBox variant="fadeIn">
                <Circle img={offer.img} index={index + 1} ismobile={isMobile}/>
              </AnimatedBox>
              <AnimatedBox variant="fadeInDown">
                <CardContentWrapper index={index + 1}>
                  <TitleTypo variant="h2" >
                    {offer.title}
                  </TitleTypo>
                  <Desciption variant="body2">
                    {offer.description}
                  </Desciption>
                </CardContentWrapper>
              </AnimatedBox>
            </StyledCard>
          </Grid>
        ))}
      </StyledGrid>
    </Section>
  );
};

export default Profession;
