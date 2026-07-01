const jwt = require('jsonwebtoken');
const config = require('../config');

function auth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const decoded = jwt.verify(token, config.auth.jwt_secret);
    req.user = decoded;
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-email'] = decoded.email;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = auth;