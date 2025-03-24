import React from "react";
import {
  Header,
  HeaderContent,
  LeftHeader,
  HShape,
  ImageContainer,
  RightHeader,
  Name,
  Description,
  MainButton,
} from "../styles/HomeStyles";
import Image from "next/image";
import AnimatedBox from "../components/AnimatedBox";

const HomeHeader = () => {
  return (
    <Header className="cnt header active" id="home">
      <HeaderContent className="header-content">
        <LeftHeader className="left-header">
          <HShape className="h-shape"></HShape>
          <ImageContainer>
            <Image
              src="/photo_2024-10-26_14-07-10.jpg"
              alt=""
              layout="fill" // Fill the container
              objectFit="cover"
            />
          </ImageContainer>
        </LeftHeader>
        <RightHeader className="right-header">
          <AnimatedBox variant="fadeInUp">
            <Name className="name">
              Alemayehu Mekonen
              <br />
              <span>Versatile Full-Stack Engineer</span> & DevOps Engineer
            </Name>
          </AnimatedBox>
          <AnimatedBox variant="fadeIn">
            <Description style={{ fontStyle: "italic" }}>
              &quot;I am a versatile Software Engineer specializing in frontend,
              backend, and devops with a passion for
              <span className="pixel">full-stack engineering.</span>&quot; I
              excel in K8s, Docker, Jenkins, Spring Boot, microservices . . .
            </Description>
          </AnimatedBox>
          <MainButton
            href="./Alemayehu Mekonen Full-Stack Software Developer CV Resume.pdf"
            className="main-btn"
            download
          >
            <span className="btn-text">Download CV</span>
            <span className="btn-icon">
              <i className="fas fa-download"></i>
            </span>
          </MainButton>
        </RightHeader>
      </HeaderContent>
    </Header>
  );
};

export default HomeHeader;
