// const express = require("express");
// const mongoose = require("mongoose");
// const authRoutes = require("./routes/auth");
// const emailRoutes = require("./routes/emails");
// require("dotenv").config();

// const app = express();
// app.use(express.json());

// mongoose
//   .connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log("Connected to MongoDB"))
//   .catch((err) => console.error("Could not connect to MongoDB", err));

// const Token = require("./models/Token");

// const loadTokens = async (userId) => {
//   const tokenDoc = await Token.findOne({ userId });
//   return tokenDoc ? tokenDoc.toObject() : null;
// };

// const saveTokens = async (userId, newTokens) => {
//   await Token.findOneAndUpdate({ userId }, newTokens, { upsert: true });
// };

// app.use("/auth", authRoutes(saveTokens));
// app.use("/emails", emailRoutes(loadTokens));

// const PORT = process.env.PORT || 8000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/emails');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

const PORT = process.env.PORT || 8000;

app.use('/auth', authRoutes);
app.use('/emails', emailRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
