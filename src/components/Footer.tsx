"use client";
import React, { useRef } from "react";
import {
  Container,
  Grid,
  Typography,
  Link as MuiLink,
  Box,
} from "@mui/material";
import {
  Facebook,
  Twitter,
  LinkedIn,
  Pinterest,
  Google,
} from "@mui/icons-material";
import { SxProps, Theme } from "@mui/material/styles";
import { Link } from "react-scroll";

const footerStyles: Record<string, SxProps<Theme>> = {
  footer: {
    backgroundColor: "#141618",
    width: "100%",
    padding: "2rem",
    color: "#e6e8ea",
    marginBottom: "2reem",
  },
  container: {
    padding: "20px",
  },
  sectionTitle: {
    color: "#27AE60",
  },
  link: {
    color: "#afb1b4",
  },
  subFooter: {
    backgroundColor: "#141618",
    padding: "50px 0",
    gap: "10px",
  },
  socialLinks: {
    color: "#e6e8ea",
    margin: "0 5px",
  },
};

const links = [
  { id: "home" },
  { id: "profession" },
  { id: "about" },
  { id: "experiance" },
  { id: "contact" },
];

const Footer: React.FC = () => {
  const navRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleClick = (id: string) => () => {
    const scrollTo = navRefs.current[id];
    if (scrollTo) {
      console.log(scrollTo);
      scrollTo.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <Box component="footer" sx={footerStyles.footer}>
      <Container sx={footerStyles.container}>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={3}>
            <div>
              <Typography variant="h6" sx={footerStyles.sectionTitle}>
                Our Contact
              </Typography>
              <address>
                <strong>Alex</strong>
                <br />
                Addis Abeba, ET.
              </address>
              <Typography>
                <i className="icon-phone" />{" "}
                <MuiLink href="tel:+251993460548" color="inherit">
                  +251 993 460 548
                </MuiLink>
                <br />
                <i className="icon-envelope-alt" /> alemayehu.dev@gmail.com
              </Typography>
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <div>
              <Typography variant="h6" sx={footerStyles.sectionTitle}>
                Quick Links
              </Typography>
              <ul style={{ listStyleType: "none", padding: 0 }}>
                {links.map(({ id }) => (
                  <Link to={id} smooth={true} duration={500} key={id}>
                    <div
                      ref={(el: any) => (navRefs.current[id] = el)}
                      style={{ color: "#afb1b4" }}
                      onClick={handleClick(id)}
                    >
                      {id}
                    </div>
                  </Link>
                ))}
              </ul>
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <div>
              <Typography variant="h6" sx={footerStyles.sectionTitle}>
                Latest Posts
              </Typography>
              <ul style={{ listStyleType: "none", padding: 0 }}>
                <li>
                  <MuiLink href="#" sx={footerStyles.link}>
                    Understanding React Hooks: A Comprehensive Guide
                  </MuiLink>
                </li>
                <li>
                  <MuiLink href="#" sx={footerStyles.link}>
                    10 Tips for Improving Your JavaScript Code
                  </MuiLink>
                </li>
                <li>
                  <MuiLink href="#" sx={footerStyles.link}>
                    Exploring the New Features in ES2024
                  </MuiLink>
                </li>
              </ul>
            </div>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <div>
              <Typography variant="h6" sx={footerStyles.sectionTitle}>
                Recent News
              </Typography>
              <ul style={{ listStyleType: "none", padding: 0 }}>
                <li>
                  <MuiLink href="#" sx={footerStyles.link}>
                    Tech Conference 2024: Key Takeaways and Highlights
                  </MuiLink>
                </li>
                <li>
                  <MuiLink href="#" sx={footerStyles.link}>
                    New Advances in AI: What to Expect in the Coming Years
                  </MuiLink>
                </li>
                <li>
                  <MuiLink href="#" sx={footerStyles.link}>
                    Cybersecurity Trends: Staying Safe in a Digital World
                  </MuiLink>
                </li>
              </ul>
            </div>
          </Grid>
        </Grid>
      </Container>
      <Box id="sub-footer" sx={footerStyles.subFooter}>
        <Container>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item>
              <Typography sx={{ color: "#e6e8ea" }}>
                <span>
                  © {new Date().getFullYear()} All rights reserved. By{" "}
                </span>
                <MuiLink
                  href="http://webthemez.com"
                  target="_blank"
                  sx={footerStyles.link}
                >
                  Alex
                </MuiLink>
              </Typography>
            </Grid>
            <Grid item>
              <div>
                <MuiLink
                  href="https://www.facebook.com/alemayehu.dev"
                  title="Facebook"
                  sx={footerStyles.socialLinks}
                >
                  <Facebook />
                </MuiLink>
                <MuiLink
                  href="https://github.com/alexdev93"
                  title="Twitter"
                  sx={footerStyles.socialLinks}
                >
                  <Twitter />
                </MuiLink>
                <MuiLink
                  href="https://www.linkedin.com/in/alemayehu-mekonen/"
                  title="LinkedIn"
                  sx={footerStyles.socialLinks}
                >
                  <LinkedIn />
                </MuiLink>
                <MuiLink
                  href="#"
                  title="Pinterest"
                  sx={footerStyles.socialLinks}
                >
                  <Pinterest />
                </MuiLink>
                <MuiLink href="#" title="Google" sx={footerStyles.socialLinks}>
                  <Google />
                </MuiLink>
              </div>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Footer;
