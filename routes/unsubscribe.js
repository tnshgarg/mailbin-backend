const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

router.post("/unsubscribe", async (req, res) => {
  try {
    // Get the unsubscribe link and user's email address from the request body
    const { unsubscribeLink, userEmail } = req.body;

    // Create a new OAuth2 client
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set the OAuth2 client credentials
    oAuth2Client.setCredentials({
      access_token: req.user.accessToken, // Assuming you have the user's access token
      refresh_token: req.user.refreshToken, // Assuming you have the user's refresh token
      expiry_date: req.user.expiryDate, // Assuming you have the token expiry date
    });

    // Create a Nodemailer transporter using Gmail OAuth2
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: userEmail, // User's email address
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: req.user.refreshToken, // Assuming you have the user's refresh token
        accessToken: req.user.accessToken, // Assuming you have the user's access token
      },
    });

    // Define the mail options
    const mailOptions = {
      from: userEmail, // User's email address
      to: unsubscribeLink,
      subject: "Unsubscribe",
      text: `Unsubscribe from ${unsubscribeLink}`,
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Error sending email" });
      } else {
        console.log("Email sent:", info.response);
        res.status(200).json({ message: "Email sent successfully" });
      }
    });
  } catch (error) {
    console.error("Error unsubscribing:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
