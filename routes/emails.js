// const express = require('express');
// const { google } = require('googleapis');
// const router = express.Router();
// require('dotenv').config();

// const oAuth2Client = new google.auth.OAuth2(
//   process.env.CLIENT_ID,
//   process.env.CLIENT_SECRET,
//   process.env.REDIRECT_URI
// );

// module.exports = (loadTokens) => {
//   const verifyTokens = async (req, res, next) => {
//     const userId = req.query.userId;  // Assuming userId is passed as a query parameter
//     const tokens = await loadTokens(userId);
//     console.log("Tokens: ", tokens)
//     if (!tokens) {
//       return res.status(401).send({ error: 'User not authenticated' });
//     }
//     oAuth2Client.setCredentials(tokens);
//     next();
//   };

//   const fetchEmails = async () => {
//     const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
//     const res = await gmail.users.messages.list({ userId: 'me', q: 'category:promotions' });
//     const messages = res.data.messages || [];
//     return messages;
//   };

//   const parseEmail = async (messageId) => {
//     const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
//     const res = await gmail.users.messages.get({ userId: 'me', id: messageId });
//     const message = res.data;
//     const headers = message.payload.headers;
//     const unsubscribeHeader = headers.find(header => header.name.toLowerCase() === 'list-unsubscribe');
//     const unsubscribeLink = unsubscribeHeader ? unsubscribeHeader.value : null;
//     return {
//       id: messageId,
//       subject: message.payload.snippet,
//       unsubscribeLink: unsubscribeLink
//     };
//   };

//   router.get('/newsletters', verifyTokens, async (req, res) => {
//     try {
//       const messages = await fetchEmails();
//       const newsletters = await Promise.all(messages.map(message => parseEmail(message.id)));
//       res.send(newsletters);
//     } catch (error) {
//       res.status(500).send({ error: 'Failed to fetch emails' });
//     }
//   });

//   return router;
// };

const express = require("express");
const { google } = require("googleapis");
const Token = require("../models/Token");
const auth = require("../middlewares/auth");
const router = express.Router();
require("dotenv").config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const fetchEmails = async () => {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  const res = await gmail.users.messages.list({
    userId: "me",
    q: "category:promotions",
  });
  const messages = res.data.messages || [];
  return messages;
};

const parseEmail = async (messageId) => {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  const res = await gmail.users.messages.get({ userId: "me", id: messageId });
  const message = res.data;
  const headers = message.payload.headers;
  const unsubscribeHeader = headers.find(
    (header) => header.name.toLowerCase() === "list-unsubscribe"
  );
  const unsubscribeLink = unsubscribeHeader ? unsubscribeHeader.value : null;
  return {
    id: messageId,
    subject: message.payload.snippet,
    unsubscribeLink: unsubscribeLink,
  };
};

// Protected route using JWT middleware
router.get("/newsletters", auth, async (req, res) => {
  try {
    const tokenDoc = await Token.findOne({ userId: req.user._id });
    if (!tokenDoc) {
      return res.status(401).send({ error: "User not authenticated" });
    }

    oAuth2Client.setCredentials(tokenDoc.toObject());

    try {
      const messages = await fetchEmails();
      const newsletters = await Promise.all(
        messages.map((message) => parseEmail(message.id))
      );
      res.send(newsletters);
    } catch (error) {
      res.status(500).send({ error: "Failed to fetch emails" });
    }

    res.send({ message: "Authenticated successfully" });
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch emails" });
  }
});

module.exports = router;
