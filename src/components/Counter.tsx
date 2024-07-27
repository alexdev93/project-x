'use client'
import React, { useState } from 'react';
import { Typography } from '@mui/material';
import { useInView } from 'react-intersection-observer';

interface CounterProps {
    targetNumber: number;
    largeText: any;
}

const Counter: React.FC<CounterProps> = ({ targetNumber, largeText }) => {
    const [number, setNumber] = useState<number>(0);
    const { ref, inView } = useInView();

    React.useEffect(() => {
        if (inView) {
            let start = 0;
            const end = targetNumber;
            if (start === end) return;

            const incrementTime = Math.abs(Math.floor(500 / (end - start)));
            const timer = setInterval(() => {
                start += 1;
                setNumber(start);
                if (start >= end) clearInterval(timer);
            }, incrementTime);

            return () => clearInterval(timer);
        }
    }, [inView, targetNumber]);

    return (
        <Typography ref={ref} variant="body1" sx={largeText}>
            {number}+
        </Typography>
    );
};

export default Counter;
