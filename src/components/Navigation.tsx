"use client";
import React from "react";
import { ControlsContainer, Control } from "./NavigationStyles";
import {
  Home as HomeIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Description as DescriptionIcon,
  MailOutline as MailOutlineIcon,
} from "@mui/icons-material";
const iconStyle = { width: 28, height: 28, fill: "#dbe1e8" };

const navigationItems = [
  { id: "home", label: "Home", icon: <HomeIcon sx={iconStyle} /> },
  { id: "about", label: "About", icon: <PersonIcon sx={iconStyle} /> },
  {
    id: "experience",
    label: "Experience",
    icon: <DescriptionIcon sx={iconStyle} />,
  },
  { id: "profession", label: "What I do", icon: <WorkIcon sx={iconStyle} /> },
  { id: "contact", label: "Contact", icon: <MailOutlineIcon sx={iconStyle} /> },
];

const Navigation: React.FC = () => {
  return (
    <ControlsContainer aria-label="Section navigation">
      {navigationItems.map(({ id, label, icon }) => (
        <Control
          key={id}
          to={id}
          smooth
          duration={500}
          spy
          offset={-40}
          activeClass="is-active"
          href={`#${id}`}
          aria-label={`Go to ${label}`}
        >
          {icon}
        </Control>
      ))}
    </ControlsContainer>
  );
};

export default Navigation;
