// token generator for testing

const jwt = require('jsonwebtoken');
const config = require('../config');

const token = jwt.sign(
  { id: 'user-123', email: 'test@example.com' },
  config.auth.jwt_secret,
  { expiresIn: '1h' }
);

console.log('Test JWT:', token);