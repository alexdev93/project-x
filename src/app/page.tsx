'use client'
import React from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import HomePage from '../pages/Home';
import Education from '../pages/Education';
import AboutMe from '../pages/AboutMe';
import Skills from '../pages/Skills';
import Contact from '../pages/Contact';
import Experiance from '../pages/Experiance';
import Profession from '../pages/Profession';
import App from './App';

export default function Home() {

  return (
        <App>
          <Navigation />
          <HomePage />
          <Profession />
          <AboutMe />
          <Education />
          <Skills />
          <Experiance />
          <Contact />
          <Footer />
        </App>
  );
}
