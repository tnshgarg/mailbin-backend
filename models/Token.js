const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  access_token: String,
  refresh_token: String,
  scope: String,
  token_type: String,
  expiry_date: Number
});

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;