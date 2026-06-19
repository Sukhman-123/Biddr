const { OAuth2Client } = require('google-auth-library');

const clientId = process.env.GOOGLE_CLIENT_ID;

const buildClient = () => {
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is missing from server/config.env');
  }
  return new OAuth2Client(clientId);
};

const verifyGoogleIdToken = async (idToken) => {
  const client = buildClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Google token is missing required fields');
  }
  return payload;
};

module.exports = { verifyGoogleIdToken };