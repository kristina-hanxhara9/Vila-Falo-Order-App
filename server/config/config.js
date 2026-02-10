// server/config/config.js
module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  port: process.env.PORT || 5000,
  mongoURI: process.env.MONGO_URI
};
  