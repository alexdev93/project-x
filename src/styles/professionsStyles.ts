'use client'
import { css } from '@emotion/react';
import createCustomTheme from '../theme';

// Get theme values
const theme = createCustomTheme();

export const offeringsStyles = {
  section: css`
    min-height: 100vh;
    max-width: 100%;
    background-color: ${theme.palette.primary.main};
    text-align: center;
    padding: 5rem 2rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  `,
  subtitle: css`
    color: ${theme.palette.grey[100]};
    font-size: 1.125rem;
    max-width: 32rem;
    margin: 0 auto 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  svg: {
    color: '#6366f1',
    marginLeft: '0.75rem',
    width: '1.5rem',
    height: '1.5rem',
  },
  heading: css`
    color: #beebd0;
    font-size: 2.25rem;
    font-weight: 600;
    max-width: 48rem;
    margin: 0 auto 4rem;
    line-height: 1.375;
    @media (min-width: 768px) {
      font-size: 3rem;
    }
    @media (min-width: 1280px) {
      font-size: 3.75rem;
    }
  `,
  grid: (ismobile: boolean) => css`
    text-align: left;
    margin: 0 auto;
    ${ismobile ? ` width: 100%; ` : `width: 85%;`};
  `,
  card: css`
    background-color: transparent;
    border-radius: 0;
    border: none;
    position: relative;
    box-shadow: none;
  `,
  cardContent: (index: number) => css`
    position: relative;
    z-index: 1;
    padding-left: ${index % 2 === 0 ? '12rem' : '0'};
    padding-right: ${index % 2 !== 0 ? '12rem' : '0'};
    @media (max-width: 1280px) {
      padding-left: 0;
      padding-right: 0;
    }
  `,
  cardTitle: css`
    color: #a3c9ac;
    margin-bottom: 1rem;
    font-size: 1.5rem;
    @media (min-width: 1280px) {
      font-size: 1.875rem;
    }
  `,
  cardDescription: css`
    color: ${theme.palette.grey[100]};
    line-height: 1rem;
    letter-spacing: 2px;
    transition: color 0.8s;
    &:hover {
      color: #fff;
    }
  `,
  circle: (img: string, index: number, ismobile: boolean) => css`
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 0;
    background: ${index === 1
      ? '#A3BFAA no-repeat 50% 50% / cover'
      : index === 2
        ? '#7EA672 no-repeat 50% 50% / cover'
        : index === 3
          ? '#7292A6 no-repeat 50% 50% / cover'
          : '#71A63C no-repeat 50% 50% / cover'
    };
    clip-path: ${index === 1
      ? 'circle(calc(2.25rem + 7.5vw) at 100% 100%)'
      : index === 2
        ? 'circle(calc(1rem + 7.5vw) at 0% 100%)'
        : index === 3
          ? 'circle(calc(2.25rem + 7.5vw) at 100% 0%)'
          : 'circle(calc(1rem + 7.5vw) at 0% 0%)'
    };
    ${ismobile ? 
      ` clip-path: none;
      background: transparent; ` : ``};
  `,
};
