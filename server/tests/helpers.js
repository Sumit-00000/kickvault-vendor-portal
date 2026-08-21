const os = require('os');
const path = require('path');

process.env.JWT_SECRET = 'test-secret-not-for-production';
process.env.DATABASE_PATH = path.join(
  os.tmpdir(),
  `kickvault-test-${process.pid}-${Math.random().toString(36).slice(2)}.db`
);

const request = require('supertest');
const { runSeed } = require('../seed');
const app = require('../src/app');

runSeed();

async function login(role, email, password = 'Passw0rd!') {
  const res = await request(app)
    .post(`/auth/${role}/login`)
    .send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed for ${email}: ${res.status}`);
  }
  return res.body.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const binaryParser = (res, cb) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

module.exports = { app, request, runSeed, login, auth, binaryParser };
