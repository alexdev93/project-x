'use client'
import React from 'react';
import { motion } from 'framer-motion';
import { Box, BoxProps } from '@mui/material';
import { useInView } from 'react-intersection-observer';
import { variants } from '../utils/variants';

interface AnimatedBoxProps extends BoxProps {
  variant: keyof typeof variants;
}

const AnimatedBox: React.FC<AnimatedBoxProps> = ({ variant, children, ...boxProps }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <Box
      component={motion.div}
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants[variant]}
      {...boxProps}
    >
      {children}
    </Box>
  );
};

export default AnimatedBox;
