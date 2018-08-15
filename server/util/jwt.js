import { TEST_MODE } from '../../constant';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const expressjwt = require('express-jwt');
const { UnauthorizedError } = require('express-jwt');
const config = require('../config/config.js'); // eslint-disable-line import/no-extraneous-dependencies

let secret = config.JWT_SECRET;
if (!secret) {
  secret = TEST_MODE ? 'likecoin' : crypto.randomBytes(64).toString('hex').slice(0, 64);
}

function getToken(req) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies && req.cookies.likecoin_auth) {
    return req.cookies.likecoin_auth;
  }
  throw new UnauthorizedError('credentials_required', { message: 'No authorization token was found' });
}

export const jwtSign = (payload) => {
  const opt = {};
  if (!payload.exp) opt.expiresIn = '7d';
  return jwt.sign(payload, secret, opt);
};

export const jwtVerify = (
  token,
  { ignoreExpiration } = {},
) => jwt.verify(token, secret, { ignoreExpiration });

export const jwtAuth = (req, res, next) => {
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  expressjwt({ secret, getToken })(req, res, (e) => {
    if (e && e.name === 'UnauthorizedError') {
      res.status(401).send('LOGIN_NEEDED');
      return;
    }
    next(e);
  });
};

export default jwtAuth;
