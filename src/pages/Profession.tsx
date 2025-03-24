"use client";
import React from "react";
import { Typography, Grid, Card, CardContent } from "@mui/material";
import { offeringsStyles } from "../styles/professionsStyles";
import styled from "@emotion/styled";
import AnimatedBox from "../components/AnimatedBox";
import useIsMobile from "../utils/mediaQueries";

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
  ${({ img, index, ismobile: isMobile }) =>
    offeringsStyles.circle(img, index, isMobile)}
`;

const StyledCard = styled(Card)`
  ${offeringsStyles.card}
`;

const StyledGrid = styled(Grid)<{ isMobile: boolean }>`
  ${({ isMobile }) => offeringsStyles.grid(isMobile)}
`;

const CardContentWrapper = styled(CardContent)<{ index: number }>`
  ${({ index }) => offeringsStyles.cardContent(index)}
`;

const Profession: React.FC = () => {
  const isMobile = useIsMobile();
  return (
    <Section id="profession">
      <Subtitle variant="subtitle1">
        career
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
      <Heading variant="h1">Comprehensive Software Solutions Engineer</Heading>
      <StyledGrid container spacing={3} isMobile={isMobile}>
        {[
          {
            varient: "fadeInLeft",
            title: "Backend Engineer",
            description:
              "Expert in Spring Boot, microservices, Docker, and event-driven architectures, delivering robust and scalable server-side applications.",
            img: "https://images.unsplash.com/photo-1587440871875-191322ee64b0?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          },
          {
            varient: "fadeInRight",
            title: "DevOps Engineer",
            description:
              "Skilled in automating CI/CD pipelines using Jenkins, container orchestration with Kubernetes, and managing Dockerized environments for seamless deployment.",
            img: "https://images.unsplash.com/photo-1590935217240-22383c90d46b?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          },
          {
            varient: "fadeInUp",
            title: "Application Administrator",
            description:
              "Experienced in managing and maintaining enterprise applications, ensuring high availability, security, and system performance across complex infrastructures.",
            img: "https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          },
          {
            varient: "fadeInDown",
            title: "Full-Stack Web Engineer",
            description:
              "Proficient in both frontend and backend technologies, delivering end-to-end solutions using modern frameworks and architectures.",
            img: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx",
          },
        ].map((offer, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <StyledCard>
              <AnimatedBox variant="fadeIn">
                <Circle img={offer.img} index={index + 1} ismobile={isMobile} />
              </AnimatedBox>
              <AnimatedBox variant="fadeInDown">
                <CardContentWrapper index={index + 1}>
                  <TitleTypo variant="h2">{offer.title}</TitleTypo>
                  <Desciption variant="body2">{offer.description}</Desciption>
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
