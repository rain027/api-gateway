// token generator for testing
require('dotenv').config();
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error('JWT_SECRET not set in .env');
  process.exit(1);
}

const token = jwt.sign(
  { id: 'user-123', email: 'test@example.com' },
  secret,
  { expiresIn: '1h' }
);

const token_b = jwt.sign(
  { id: 'user-456', email: 'testb@example.com' },
  secret,
  { expiresIn: '1h' }
);

console.log('Test JWT:', token);
console.log('Test_B token:', token_b)