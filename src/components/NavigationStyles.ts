import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { Link as ScrollLink } from 'react-scroll';
import createCustomTheme from './../theme';

// Get theme values
const theme = createCustomTheme();

export const ControlsContainer = styled.nav`
  position: fixed;
  z-index: 10;
  top: 50%;
  right: 3%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  
  @media (max-width: 700px) {
    gap:0.5rem;
    top: auto;
    bottom: 0;
    flex-direction: row;
    justify-content: center;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
  }
`;

export const Control = styled(ScrollLink)`
  cursor: pointer;
  background-color: ${theme.palette.grey[400]};
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.3);
  transition: background-color 0.3s ease-in-out;

  &:hover,
  &.is-active {
    background-color: ${theme.palette.secondary.main};
  }

  &:hover > svg,
  &.is-active > svg {
    fill: ${theme.palette.common.white};
  }

  &:focus-visible {
    outline: 2px solid ${theme.palette.secondary.main};
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const NavigationIcon = css`
  width: 28px;
  height: 28px;
  fill: ${theme.palette.grey[200]}; /* Adjust based on your design */
`;
