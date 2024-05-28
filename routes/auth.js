const express = require("express");
const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Token = require("../models/Token");
const router = express.Router();
require("dotenv").config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const generateAuthToken = (user) => {
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: "365d",
  });
  return token;
};

router.get("/login", (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
  res.send({ url: authUrl });
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const userInfo = await google
      .oauth2({ version: "v2", auth: oAuth2Client })
      .userinfo.get();
    console.log("userinfo: ", userInfo);
    const id = userInfo.data.id;
    if (!id) {
      throw new Error("User id not found in Google profile.");
    }

    let user = await User.findOne({ id });
    console.log("user: ", user);

    if (!user) {
      user = new User({ id });
      await user.save();
    }

    await Token.findOneAndUpdate(
      { userId: user._id },
      { ...tokens, userId: user._id },
      { upsert: true }
    );

    // Generate JWT token and send it in response
    const authToken = generateAuthToken(user);
    res.send({ user, token: authToken, id: id });
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.status(500).send({ error: "Failed to authenticate" });
  }
});

module.exports = router;
