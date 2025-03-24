"use client";
import React, { useState } from "react";
import {
  Container,
  Grid,
  Typography,
  TextField,
  Button,
  Box,
  Link as MuiLink,
} from "@mui/material";
import { Email, Phone, LocationOn } from "@mui/icons-material";
import contactStyles from "@/styles/contactStyles";
import AnimatedBox from "../components/AnimatedBox";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Define the FormData interface
interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/sendEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success)
        alert(`${result.name} your feedback sent successfully to Alex`);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      style={{
        minHeight: "120vh",
        width: "100%",
        maxWidth: "100%",
        padding: 0,
        backgroundColor: "#191d2b",
        display: "grid",
        placeItems: "center",
        marginBottom: 10,
      }}
      id="contact"
    >
      <Container sx={contactStyles.container}>
        <AnimatedBox variant="fadeInUp">
          <Typography variant="h4" sx={contactStyles.title}>
            Contact Me
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: "center",
              fontWeight: "bold",
              p: { xs: 1, sm: 2, md: 3 }, // Responsive padding
              fontSize: { xs: "0.875rem", sm: "1rem", md: "1.125rem" }, // Responsive font size
              whiteSpace: { xs: "normal", sm: "nowrap" }, // Collapsed on larger screens
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            I&apos;d love to hear from you! Whether you have feedback,
            questions, or want to get in touch, feel free to fill out the form
            below. Your input helps us improve and serve you better!
          </Typography>
        </AnimatedBox>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Box sx={contactStyles.section}>
              <Typography
                variant="h6"
                sx={{ marginBottom: "1em", color: "#5dbb65" }}
              >
                Contact Information
              </Typography>
              <Box sx={contactStyles.contactItem}>
                <Email sx={contactStyles.contactIcon} />
                <Typography sx={contactStyles.contactInfo}>
                  <MuiLink href="mailto:email@domain.com" color="inherit">
                    alemayehu.dev@gmail.com
                  </MuiLink>
                </Typography>
              </Box>
              <Box sx={contactStyles.contactItem}>
                <Phone sx={contactStyles.contactIcon} />
                <Typography sx={contactStyles.contactInfo}>
                  <MuiLink href="tel:+251993460548" color="inherit">
                    +251 993 460 548
                  </MuiLink>
                </Typography>
              </Box>
              <Box sx={contactStyles.contactItem}>
                <LocationOn sx={contactStyles.contactIcon} />
                <Typography sx={contactStyles.contactInfo}>
                  Addis Abeba, Ethiopia
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={contactStyles.section}>
              <Typography
                variant="h6"
                sx={{ marginBottom: "1em", color: "#5dbb65" }}
              >
                Send Me a Message
              </Typography>
              <Box
                component="form"
                sx={contactStyles.form}
                onSubmit={handleSubmit}
              >
                <TextField
                  label="Name"
                  variant="outlined"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  sx={contactStyles.formField}
                  required
                  InputLabelProps={{
                    sx: contactStyles.labelField,
                  }}
                />
                <TextField
                  label="Email"
                  variant="outlined"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  sx={contactStyles.formField}
                  type="email"
                  required
                  InputLabelProps={{
                    sx: contactStyles.labelField,
                  }}
                />
                <TextField
                  label="Subject"
                  variant="outlined"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  sx={contactStyles.formField}
                  required
                  InputLabelProps={{
                    sx: contactStyles.labelField,
                  }}
                />
                <TextField
                  label="Message"
                  variant="outlined"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  sx={contactStyles.formField}
                  multiline
                  rows={4}
                  required
                  InputLabelProps={{
                    sx: contactStyles.labelField,
                  }}
                />
                <Button
                  type="submit"
                  sx={contactStyles.submitButton}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Container>
  );
};

export default ContactPage;
