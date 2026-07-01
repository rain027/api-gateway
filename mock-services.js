const express = require('express')

const users = express();
users.get('/', (req, res) => res.json({ service: 'users', data: [] }));
users.listen(4001, () => console.log('Users service on 4001'));

const payments = express();
payments.get('/', (req, res) => res.json({ service: 'payments', data: [] }));
payments.listen(4002, () => console.log('Payments service on 4002'));