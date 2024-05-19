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
