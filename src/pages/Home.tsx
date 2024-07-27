
import React from 'react';
import {
  Header,
  HeaderContent,
  LeftHeader,
  HShape,
  ImageContainer,
  RightHeader,
  Name,
  Description,
  MainButton
} from '../styles/HomeStyles';
import Image from 'next/image';
import AnimatedBox from '../components/AnimatedBox';

const HomeHeader = () => {
  return (
    <Header className="cnt header active" id="home">
      <HeaderContent className="header-content">
        <LeftHeader className="left-header">
          <HShape className="h-shape"></HShape>
          <ImageContainer>
            <Image
              src='/Alemayehu.jpg'
              alt=""
              layout='fill' // Fill the container
              objectFit='cover'
            />
          </ImageContainer>
        </LeftHeader>
        <RightHeader className="right-header">
          <AnimatedBox variant="fadeInUp">
            <Name className="name">
              Alemayehu Mekonen
              <br /><span>Versatile Full-Stack</span> Software Developer
            </Name>
          </AnimatedBox>
          <AnimatedBox variant="fadeIn">
            <Description style={{ fontStyle: 'italic' }}>
              &quot;I am a versatile software developer specializing in frontend, backend, and
              <span className="pixel">full-stack engineering.</span>&quot;
              I excel in Node.js, Next.js, Material-UI, Spring Boot, microservices, Docker, and event-driven architectures, delivering high-quality, responsive applications.
            </Description>
          </AnimatedBox>
          <MainButton href="./ALEMAYEHU_MEKONEN[RESUME].pdf" className="main-btn" download>
            <span className="btn-text">Download CV</span>
            <span className="btn-icon"><i className="fas fa-download"></i></span>
          </MainButton>
        </RightHeader>
      </HeaderContent>
    </Header>
  );
};

export default HomeHeader;
