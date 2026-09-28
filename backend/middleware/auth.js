const db = require('../db');

/**
 * Middleware to require authentication on protected routes
 */
async function requireAuth(req, res, next) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in to continue.' });
    }

    const result = await db.query(
      'SELECT id, google_id, name, email, profile_picture, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      req.session.destroy();
      return res.status(401).json({ error: 'User no longer exists. Please sign in again.' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server authentication error' });
  }
}

module.exports = {
  requireAuth
};
