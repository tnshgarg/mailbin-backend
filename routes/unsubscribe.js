// const express = require("express");
// const router = express.Router();
// const nodemailer = require("nodemailer");
// const { google } = require("googleapis");
// require("dotenv").config();

// const OAuth2 = google.auth.OAuth2;

// router.post("/unsubscribe", async (req, res) => {
//   try {
//     // Get the unsubscribe link and user's email address from the request body
//     const { unsubscribeLink, userEmail } = req.body;

//     const createTransporter = async () => {
//         const oauth2Client = new OAuth2(
//           process.env.CLIENT_ID,
//           process.env.CLIENT_SECRET,
//           process.env.REDIRECT_URI
//         );

//       //   oauth2Client.setCredentials({
//       //     refresh_token: process.env.REFRESH_TOKEN
//       //   });

//         const accessToken = await new Promise((resolve, reject) => {
//           oauth2Client.getAccessToken((err, token) => {
//             if (err) {
//               reject("Failed to create access token :(");
//             }
//             resolve(token);
//           });
//         });

//         const transporter = nodemailer.createTransport({
//           service: "gmail",
//           auth: {
//             type: "OAuth2",
//             user: userEmail,
//             accessToken,
//             clientId: process.env.CLIENT_ID,
//             clientSecret: process.env.CLIENT_SECRET,
//             refreshToken: process.env.REFRESH_TOKEN
//           }
//         });

//         return transporter;
//       };

//       const sendEmail = async (emailOptions) => {
//         let emailTransporter = await createTransporter();
//         await emailTransporter.sendMail(emailOptions);
//       };

//       sendEmail({
//         subject: "Test",
//         text: "I am sending an email from nodemailer!",
//         to: "put_email_of_the_recipient",
//         from: process.env.EMAIL
//       });

//     const oAuth2Client = new google.auth.OAuth2(
//       process.env.GOOGLE_CLIENT_ID,
//       process.env.GOOGLE_CLIENT_SECRET,
//       process.env.GOOGLE_REDIRECT_URI
//     );

//     // Set the OAuth2 client credentials
//     oAuth2Client.setCredentials({
//       access_token: req.user.accessToken, // Assuming you have the user's access token
//       refresh_token: req.user.refreshToken, // Assuming you have the user's refresh token
//       expiry_date: req.user.expiryDate, // Assuming you have the token expiry date
//     });

//     // Create a Nodemailer transporter using Gmail OAuth2
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         type: "OAuth2",
//         user: userEmail, // User's email address
//         clientId: process.env.GOOGLE_CLIENT_ID,
//         clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//         refreshToken: req.user.refreshToken, // Assuming you have the user's refresh token
//         accessToken: req.user.accessToken, // Assuming you have the user's access token
//       },
//     });

//     // Define the mail options
//     const mailOptions = {
//       from: userEmail, // User's email address
//       to: unsubscribeLink,
//       subject: "Unsubscribe",
//       text: `Unsubscribe from ${unsubscribeLink}`,
//     };

//     // Send the email
//     transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         console.error("Error sending email:", error);
//         res.status(500).json({ error: "Error sending email" });
//       } else {
//         console.log("Email sent:", info.response);
//         res.status(200).json({ message: "Email sent successfully" });
//       }
//     });
//   } catch (error) {
//     console.error("Error unsubscribing:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// module.exports = router;

require("dotenv").config();
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const axios = require("axios");
const auth = require("../middlewares/auth");

const OAuth2 = google.auth.OAuth2;

const app = express();
app.use(express.json());

const createTransporter = async (userEmail, oauth2Client) => {
  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        reject("Failed to create access token :(");
      }
      resolve(token);
    });
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: userEmail,
      accessToken,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
    },
  });

  return transporter;
};

const sendEmail = async (emailOptions, userEmail, oauth2Client) => {
  let emailTransporter = await createTransporter(userEmail, oauth2Client);
  await emailTransporter.sendMail(emailOptions);
};

const unsubscribeFromEmails = async (emails, userEmail, oauth2Client) => {
  for (const email of emails) {
    const unsubscribeLinks = email.unsubscribeLink.split(", ");

    for (const link of unsubscribeLinks) {
      if (link.startsWith("<mailto:")) {
        const mailtoLink = link.slice(8, -1);
        const [emailAddress, subject] = mailtoLink.split("?subject=");
        await sendEmail(
          {
            to: emailAddress,
            from: userEmail,
            subject: subject || "Unsubscribe",
            text: "Unsubscribe request.",
          },
          userEmail,
          oauth2Client
        );
      } else if (link.startsWith("<http")) {
        const url = link.slice(1, -1);
        await axios.get(url);
      }
    }
  }
};

router.post("/unsubscribe", auth, async (req, res) => {
  const { emails, token } = req.body;

  if (!emails || !Array.isArray(emails) || !token) {
    return res
      .status(400)
      .send(
        "Invalid request body. 'emails' must be an array and 'token' must be provided."
      );
  }

  const oauth2Client = new OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: req.user.accessToken, // Assuming you have the user's access token
    refresh_token: req.user.refreshToken, // Assuming you have the user's refresh token
    expiry_date: req.user.expiryDate,
  });

  try {
    const userInfo = await google
      .oauth2({ version: "v2", auth: oauth2Client })
      .userinfo.get();
    const userEmail = userInfo.data.email;

    await unsubscribeFromEmails(emails, userEmail, oauth2Client);
    res.status(200).send("Unsubscribed successfully.");
  } catch (error) {
    res.status(500).send("Error unsubscribing: " + error.message);
  }
});

module.exports = router;
