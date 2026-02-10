// server/config/config.js

// Strip accidental "KEY=" prefix from env var values (common Railway misconfiguration)
function cleanEnv(val, prefix) {
  if (val && val.startsWith(prefix + '=')) {
    return val.slice(prefix.length + 1);
  }
  return val;
}

module.exports = {
  jwtSecret: cleanEnv(process.env.JWT_SECRET, 'JWT_SECRET'),
  port: process.env.PORT || 5000,
  mongoURI: cleanEnv(process.env.MONGO_URI, 'MONGO_URI')
};
  