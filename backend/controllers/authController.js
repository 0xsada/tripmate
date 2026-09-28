const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const db = require('../db');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Helper to find or create a user in PostgreSQL
 */
async function findOrCreateUser({ googleId, name, email, profilePicture }) {
  // Check by google_id
  let res = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  if (res.rows.length > 0) {
    // Optionally update name or picture if changed
    const updateRes = await db.query(
      'UPDATE users SET name = $1, profile_picture = COALESCE($2, profile_picture) WHERE id = $3 RETURNING id, google_id, name, email, profile_picture, created_at',
      [name, profilePicture, res.rows[0].id]
    );
    return updateRes.rows[0];
  }

  // Check by email in case of account link
  res = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  if (res.rows.length > 0) {
    const updateRes = await db.query(
      'UPDATE users SET google_id = $1, name = $2, profile_picture = COALESCE($3, profile_picture) WHERE email = $4 RETURNING id, google_id, name, email, profile_picture, created_at',
      [googleId, name, profilePicture, email]
    );
    return updateRes.rows[0];
  }

  // Insert new user
  const insertRes = await db.query(
    'INSERT INTO users (google_id, name, email, profile_picture) VALUES ($1, $2, $3, $4) RETURNING id, google_id, name, email, profile_picture, created_at',
    [googleId, name, email, profilePicture]
  );
  return insertRes.rows[0];
}

/**
 * GET /api/auth/me
 * Return currently authenticated user
 */
async function getMe(req, res) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ user: null, authenticated: false });
    }

    const result = await db.query(
      'SELECT id, google_id, name, email, profile_picture, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      req.session.destroy();
      return res.status(401).json({ user: null, authenticated: false });
    }

    res.json({ user: result.rows[0], authenticated: true });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ error: 'Server error retrieving user' });
  }
}

/**
 * POST /api/auth/google
 * Verify Google ID Token (GIS) or OAuth2 Access Token
 */
async function googleLogin(req, res) {
  try {
    const { credential, access_token } = req.body;
    if (!credential && !access_token) {
      return res.status(400).json({ error: 'Missing Google credential or access token' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;

    let payload;
    if (credential) {
      if (!clientId) {
        return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured on server' });
      }
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: clientId
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        console.error('Google token verification failed:', verifyErr.message);
        return res.status(401).json({ error: 'Invalid Google authentication token: ' + verifyErr.message });
      }
    } else if (access_token) {
      try {
        const googleRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        payload = googleRes.data;
      } catch (tokenErr) {
        console.error('Google access token verification failed:', tokenErr.message);
        return res.status(401).json({ error: 'Failed to verify Google access token with Google API' });
      }
    }

    if (!payload || !payload.sub || !payload.email) {
      return res.status(400).json({ error: 'Invalid user info received from Google' });
    }

    const user = await findOrCreateUser({
      googleId: payload.sub,
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      profilePicture: payload.picture || null
    });

    req.session.userId = user.id;

    res.json({
      message: 'Authentication successful',
      user
    });
  } catch (error) {
    console.error('googleLogin error:', error);
    res.status(500).json({ error: 'Google login failed: ' + error.message });
  }
}

/**
 * POST /api/auth/demo
 * Student/Evaluator 1-click test login
 */
async function demoLogin(req, res) {
  try {
    const user = await findOrCreateUser({
      googleId: 'demo-student-id-1001',
      name: 'Sai (Demo User)',
      email: 'sai.traveler@example.com',
      profilePicture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
    });

    req.session.userId = user.id;

    res.json({
      message: 'Logged in as demo user',
      user
    });
  } catch (error) {
    console.error('demoLogin error:', error);
    res.status(500).json({ error: 'Demo login failed: ' + error.message });
  }
}

/**
 * POST /api/auth/logout
 * Log out and destroy session
 */
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
}

module.exports = {
  getMe,
  googleLogin,
  demoLogin,
  logout
};
