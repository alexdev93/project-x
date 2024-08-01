'use client'
import React, { useEffect, useState, ReactNode } from 'react';
import Grid from '@mui/material/Grid';
import LoaderComponent from '../components/Loader';

interface HomeProps {
    children: ReactNode;
}

const App: React.FC<HomeProps> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <Grid style={{ width: '100%', maxWidth: '100%', padding: 0 }}>
            {isLoading ? (
                <LoaderComponent />
            ) : (
                <Grid spacing={5} style={{ width: '100%', maxWidth: '100%', padding: 0, marginBottom: 10 }} >
                    {children}
                </Grid>
            )}
        </Grid>
    );
};

export default App;
