// components/LoaderComponent.tsx

import React from 'react';
import {
  LoaderContainer,
  Pencil,
  PencilBallPoint,
  PencilCap,
  PencilCapBase,
  PencilMiddle,
  PencilEraser,
  Line,
  LoadText,
} from './LoaderStyles'; // Import styled components from external file

const LoaderComponent: React.FC = () => {
  return (
    <LoaderContainer>
      <Pencil>
        <PencilBallPoint />
        <PencilCap />
        <PencilCapBase />
        <PencilMiddle />
        <PencilEraser />
      </Pencil>
      <Line />
      <LoadText> Loading... </LoadText>
    </LoaderContainer>
  );
};

export default LoaderComponent;
