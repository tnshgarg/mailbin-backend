// const express = require('express');
// const { google } = require('googleapis');
// const router = express.Router();
// require('dotenv').config();

// const oAuth2Client = new google.auth.OAuth2(
//   process.env.CLIENT_ID,
//   process.env.CLIENT_SECRET,
//   process.env.REDIRECT_URI
// );

// module.exports = (saveTokens) => {
//   router.post('/login', (req, res) => {
//     const authUrl = oAuth2Client.generateAuthUrl({
//       access_type: 'offline',
//       scope: ['https://www.googleapis.com/auth/gmail.readonly'],
//     });
//     res.send({ url: authUrl });
//   });

//   router.get('/callback', async (req, res) => {
//     const code = req.query.code;
//     const userId = req.query.userId;  // Assuming userId is passed as a query parameter
//     try {
//       const { tokens: newTokens } = await oAuth2Client.getToken(code);
//       oAuth2Client.setCredentials(newTokens);
//       await saveTokens(userId, newTokens);  // Save tokens with userId
//       res.send('Authentication successful! You can close this window.');
//     } catch (error) {
//       res.status(500).send({ error: 'Failed to authenticate' });
//     }
//   });

//   return router;
// };

const express = require('express');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Token = require('../models/Token');
const router = express.Router();
require('dotenv').config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const generateAuthToken = (user) => {
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
  return token;
};

// Google OAuth login
router.get('/login', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/userinfo.profile'],
  });
  res.send({ url: authUrl });
});

// Google OAuth callback
router.get('/callback', async (req, res) => {
  const code = req.query.code;

  try {
    console.log(1)
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Get user email from tokens
    console.log(2)
    const userInfo = await google.oauth2({ version: 'v2', auth: oAuth2Client }).userinfo.get();
    const id = userInfo.data.id;
    console.log(3)
    if (!id) {
      throw new Error('User id not found in Google profile.');
    }

    // Check if the user already exists
    console.log(4)
    let user = await User.findOne({ id });
    console.log("user: ", user)

    if (!user) {
      console.log(41)
      // Create a new user if not found
      user = new User({ id });
      await user.save();
    }

    // Save/update tokens for the user
    console.log(5)
    await Token.findOneAndUpdate(
      { userId: user._id },
      { ...tokens, userId: user._id },
      { upsert: true }
    );

    // Generate JWT token and send it in response
    console.log(6)
    const authToken = generateAuthToken(user);
    console.log("authtoken: ", authToken)
    console.log("user: ", user)
    res.send({ user, token: authToken });
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).send({ error: 'Failed to authenticate' });
  }
});


module.exports = router;
