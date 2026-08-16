import React from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Hero from "@/components/sections/Hero";
import AboutMe from "@/components/sections/AboutMe";
import Experience from "@/components/sections/Experience";
import Profession from "@/components/sections/Profession";
import Education from "@/components/sections/Education";
import Skills from "@/components/sections/Skills";
import Contact from "@/components/sections/Contact";

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <AboutMe />
        <Experience />
        <Profession />
        <Education />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
