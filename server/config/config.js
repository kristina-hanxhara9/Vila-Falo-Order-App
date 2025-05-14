// server/config/config.js
module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  // No expiration is defined here since we want tokens to never expire
  port: process.env.PORT || 5000,
  mongoURI: process.env.MONGO_URI || 'mongodb+srv://kristinazhidro97:vilafalo@cluster0.7kzfmxk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
};
  