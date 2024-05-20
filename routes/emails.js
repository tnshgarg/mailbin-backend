const express = require("express");
const { google } = require("googleapis");
const Token = require("../models/Token");
const router = express.Router();
const axios = require("axios");
const auth = require("../middlewares/auth");
require("dotenv").config();

const extractDomainFromEmailString = (emailString) => {
  const emailMatch = emailString.match(/<([^>]+)>/);
  if (emailMatch && emailMatch[1]) {
    const email = emailMatch[1];
    const domainMatch = email.match(/@(.+)/);
    if (domainMatch && domainMatch[1]) {
      const fullDomain = domainMatch[1];
      const domainParts = fullDomain.split(".");
      if (domainParts.length > 2) {
        return domainParts.slice(-2).join(".");
      }
      return fullDomain; // If no subdomain, return the full domain
    }
  }
  return null;
};

const extractCompanyName = (email) => {
  const fromEmail = email.split("<")[1]?.split(">")[0];
  const fullDomain = fromEmail.split("@")[1].split(".");
  const companyName =
    fullDomain[2] && fullDomain[0] ? fullDomain[1] : fullDomain[0];
  return companyName || "Unknown";
};

const groupEmailsByDomain = (emails) => {
  const domainMap = new Map();
  emails.forEach((email) => {
    console.log("Email: ", email);
    const mainDomain = extractDomainFromEmailString(email.from);
    if (mainDomain) {
      if (!domainMap.has(mainDomain)) {
        domainMap.set(mainDomain, {
          emails: [email],
          companyName: extractCompanyName(email.from),
          companyLogo: `https://logo.clearbit.com/${mainDomain}`,
          unsubscribeLink: email.unsubscribeLink,
        });
      } else {
        domainMap.get(mainDomain).emails.push(email);
      }
    }
  });

  // Convert map to array
  return Array.from(domainMap.values());
};

const fetchEmails = async (auth) => {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.list({
    userId: "me",
    q: "unsubscribe",
  });

  const messages = res.data.messages || [];
  const emails = [];
  for (const message of messages) {
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      q: "List-Unsubscribe",
    });
    const headers = msg.data.payload.headers;
    const fromHeader = headers.find((header) => header.name === "From");
    const unsubscribeHeader = headers.find(
      (header) => header.name === "List-Unsubscribe"
    );
    const from = fromHeader ? fromHeader.value : "";
    const unsubscribeLink = unsubscribeHeader ? unsubscribeHeader.value : "";
    console.log("message: ", msg);
    emails.push({ from, unsubscribeLink });
  }

  return emails;
};

router.get("/newsletters", auth, async (req, res) => {
  try {
    const token = await Token.findOne({ userId: req.user._id });
    if (!token) {
      return res.status(401).send({ error: "User not authenticated" });
    }
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oAuth2Client.setCredentials(token);

    const emails = await fetchEmails(oAuth2Client);
    const groupedEmails = groupEmailsByDomain(emails);

    res.send(groupedEmails);
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).send({ error: "Failed to fetch emails" });
  }
});

router.post("/unsubscribe", async (req, res) => {
  try {
    // Get the unsubscribe link and email address from the request body
    const { unsubscribeLink, email } = req.body;

    // Make a POST request to the unsubscribe link
    if (unsubscribeLink) {
      const response = await axios.post(unsubscribeLink);

      // Check if the unsubscribe request was successful
      if (response.status === 200) {
        // Optionally, you can update your database or perform other actions here
        // For example, mark the email address as unsubscribed in your system

        // Send a success response
        res.status(200).json({ message: "Unsubscribed successfully" });
      } else {
        // Handle unsuccessful unsubscribe request
        res.status(400).json({ error: "Failed to unsubscribe" });
      }
    }
  } catch (error) {
    console.error("Error unsubscribing:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
