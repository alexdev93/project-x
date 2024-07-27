'use client'
import styled from '@emotion/styled';
import { Container as MuiContainer } from '@mui/material';

export const Container = styled(MuiContainer)`
  min-height: 120vh;
  width: 100%;
  max-width: 100%;
  padding: 0;
  margin-bottom: 10px;
  display: grid;
  place-items: center;
  background-color: #f5f5f5;
`;

export const OuterContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0 20px;
  align-items: center;
`;

export const Heading = styled.h1`
  color: #333;
  margin-bottom: 40px;
  font-size: 2.5rem;
  text-align: center;
  font-weight: 700;
`;

export const StickyCard = styled.div<{ bgColor: string }>`
  width: 90%;
  max-width: 600px;
  padding: 20px;
  border-radius: 10px;
  color: #fff;
  margin: 20px 0;
  position: relative;
  background: ${(props) => props.bgColor};
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);

  &:nth-of-type(even) {
    align-self: flex-end;
  }

  &:nth-of-type(odd) {
    align-self: flex-start;
  }

  @media (max-width: 768px) {
    width: 95%;
    margin: 10px auto;
  }
`;

export const CardBody = styled.div`
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0 0 10px 10px;
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  padding: 10px 20px;
  border-radius: 10px 10px 0 0;
`;

export const CardTitle = styled.h2`
  font-size: 1.5rem;
  color: #fff;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

export const CardDate = styled.span`
  font-size: 1.1rem;
  color: #fff;
  font-weight: 300;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

export const CardDetail = styled.p`
  font-size: 1rem;
  color: #fff;
  line-height: 1.5;
  margin: 0;
`;
