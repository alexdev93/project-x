'use client'
import React, { useRef } from 'react';
import { IconButton } from '@mui/material';
import { ControlsContainer, Control } from './NavigationStyles'; // Ensure these styles are correctly imported
import {
  Home as HomeIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Description as DescriptionIcon,
  MailOutline as MailOutlineIcon,
} from '@mui/icons-material';
import { Link } from 'react-scroll';

const iconStyle = { width: 28, height: 28, fill: '#dbe1e8' }

const navigationItems = [
  { id: 'home', icon: <HomeIcon sx={iconStyle} /> },
  { id: 'profession', icon: <PersonIcon sx={iconStyle} /> },
  { id: 'about', icon: <WorkIcon sx={iconStyle} /> },
  { id: 'experiance', icon: <DescriptionIcon sx={iconStyle} /> },
  { id: 'contact', icon: <MailOutlineIcon sx={iconStyle} /> },
];

const Navigation: React.FC = () => {
  const navRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleClick = (id: string) => () => {
    const scrollTo = navRefs.current[id];
    if (scrollTo) {
      scrollTo.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <ControlsContainer>
      {navigationItems.map(({ id, icon }) => (
        <Link to={id} smooth={true} duration={500} key={id}>
          <Control
            ref={(el: any) => (navRefs.current[id] = el)}
            className="control"
            onClick={handleClick(id)}
          >
            <IconButton>{icon}</IconButton>
          </Control>
        </Link>
      ))}
    </ControlsContainer>
  );
};

export default Navigation;
