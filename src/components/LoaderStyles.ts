'use client'
import styled from '@emotion/styled';
import createCustomTheme from './../theme';

// Get theme values
const theme = createCustomTheme();

export const LoaderContainer = styled.div`
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  color: ${theme.palette.secondary.main};
  overflow-x: hidden;
  background-color: ${theme.palette.primary.main};
`;

export const Pencil = styled.div`
  position: relative;
  width: 200px;
  height: 30px;
  transform-origin: center;
  transform: rotate(135deg);
  animation: pencilAnimation 10s infinite;

  @keyframes pencilAnimation {
    0% {
      transform: rotate(135deg);
    }
    20% {
      transform: rotate(315deg);
    }
    45% {
      transform: translateX(300px) rotate(315deg);
    }
    55% {
      transform: translateX(300px) rotate(495deg);
    }
    100% {
      transform: rotate(495deg);
    }
  }
`;

export const PencilBallPoint = styled.div`
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  background: #09d56e;
  height: 10px;
  width: 10px;
  border-radius: 50px;
`;

export const PencilCap = styled.div`
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  clip-path: polygon(20% 40%, 100% 0%, 100% 100%, 20% 60%);
  background: #232123;
  width: 12%;
  height: 100%;
`;

export const PencilCapBase = styled.div`
  position: absolute;
  left: 12%;
  top: 0;
  height: 100%;
  width: 20px;
  background: #232123;
`;

export const PencilMiddle = styled.div`
  position: absolute;
  left: calc(12% + 20px);
  top: 0;
  height: 100%;
  width: 70%;
  background: #09d56e;
`;

export const PencilEraser = styled.div`
  position: absolute;
  left: calc(12% + 70% + 20px);
  top: 0;
  height: 100%;
  width: 11%;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  background: ${theme.palette.secondary.main};
`;

export const Line = styled.div`
  position: relative;
  top: 80px;
  right: 103px;
  height: 10px;
  width: 1000px;
  z-index: -1;
  border-radius: 50px;
  background-color: ${theme.palette.secondary.main};
  color: ${theme.palette.secondary.main};
  transform: scaleX(0);
  transform-origin: center;
  animation: lineAnimation 10s infinite;

  @keyframes lineAnimation {
    20% {
      transform: scaleX(0);
    }
    45% {
      transform: scaleX(0.6);
    }
    55% {
      transform: scaleX(0.6);
    }
    100% {
      transform: scaleX(0);
    }
  }
`;

export const LoadText = styled.h2`
  justify-self: self-end;
  position: relative;
  top: 150px;
  color: ${theme.palette.secondary.main};
`;

// Media query example (adjust as needed)
export const LineMediaQuery = styled(Line)`
  color: ${theme.palette.secondary.main};
  @media screen and (max-width: 800px) {
    width: 400px;
  }
`;
