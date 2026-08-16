"use client";
import React from "react";
import {
  Container,
  Grid,
  Typography,
  Link as MuiLink,
  Box,
  IconButton,
} from "@mui/material";
import { GitHub, LinkedIn, Email as EmailIcon } from "@mui/icons-material";
import { SxProps, Theme } from "@mui/material/styles";
import { Link } from "react-scroll";

const footerStyles: Record<string, SxProps<Theme>> = {
  footer: {
    backgroundColor: "#141618",
    width: "100%",
    padding: "2rem",
    color: "#e6e8ea",
  },
  container: { padding: "20px" },
  sectionTitle: { color: "#27AE60", marginBottom: "0.75rem" },
  link: {
    color: "#afb1b4",
    textDecoration: "none",
    cursor: "pointer",
    display: "inline-block",
    padding: "0.25rem 0",
    "&:hover": { color: "#e6e8ea" },
  },
  subFooter: { backgroundColor: "#141618", paddingTop: "2rem" },
  socialLink: { color: "#e6e8ea", "&:hover": { color: "#27AE60" } },
};

const quickLinks = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "profession", label: "What I do" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
];

const socials = [
  {
    href: "https://github.com/alexdev93",
    label: "GitHub profile",
    icon: <GitHub />,
  },
  {
    href: "https://www.linkedin.com/in/alemayehu-mekonen/",
    label: "LinkedIn profile",
    icon: <LinkedIn />,
  },
  {
    href: "mailto:alemayehu.dev@gmail.com",
    label: "Send an email",
    icon: <EmailIcon />,
  },
];

const Footer: React.FC = () => {
  return (
    <Box component="footer" sx={footerStyles.footer}>
      <Container sx={footerStyles.container}>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" sx={footerStyles.sectionTitle}>
              Get in touch
            </Typography>
            <Typography component="address" sx={{ fontStyle: "normal" }}>
              Addis Ababa, Ethiopia
              <br />
              <MuiLink href="tel:+251993460548" sx={footerStyles.link}>
                +251 993 460 548
              </MuiLink>
              <br />
              <MuiLink
                href="mailto:alemayehu.dev@gmail.com"
                sx={footerStyles.link}
              >
                alemayehu.dev@gmail.com
              </MuiLink>
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="h6" sx={footerStyles.sectionTitle}>
              Quick links
            </Typography>
            <Box
              component="ul"
              sx={{ listStyle: "none", padding: 0, margin: 0 }}
            >
              {quickLinks.map(({ id, label }) => (
                <li key={id}>
                  <Box
                    component={Link}
                    to={id}
                    smooth
                    duration={500}
                    sx={footerStyles.link}
                  >
                    {label}
                  </Box>
                </li>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>

      <Box sx={footerStyles.subFooter}>
        <Container>
          <Grid
            container
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Grid item>
              <Typography variant="body2" sx={{ color: "#afb1b4" }}>
                © {new Date().getFullYear()} Alemayehu Mekonen
              </Typography>
            </Grid>
            <Grid item>
              {socials.map(({ href, label, icon }) => (
                <IconButton
                  key={href}
                  href={href}
                  aria-label={label}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    href.startsWith("http") ? "noopener noreferrer" : undefined
                  }
                  sx={footerStyles.socialLink}
                >
                  {icon}
                </IconButton>
              ))}
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Footer;
