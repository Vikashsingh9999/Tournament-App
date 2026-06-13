const { createClient } = require('@libsql/client');
const jwt = require('jsonwebtoken');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

module.exports = async (req, res) => {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  // 1. Verify Authorization Header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: "Authorization token required." });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || "champions-cup-super-secret-key-2026";

  try {
    jwt.verify(token, jwtSecret);
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired authorization token." });
  }

  // 2. Query registrations from Turso DB
  const dbUrl = process.env.LIBSQL_DB_URL;
  const dbAuthToken = process.env.LIBSQL_DB_AUTH_TOKEN;

  if (!dbUrl) {
    return res.status(500).json({ success: false, message: "Server configuration error: Database URL not set." });
  }

  const dbClient = createClient({ url: dbUrl, authToken: dbAuthToken });

  try {
    const tableCheck = await dbClient.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='registrations'");
    
    if (tableCheck.rows.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const results = await dbClient.execute("SELECT * FROM registrations ORDER BY created_at DESC");
    
    // Map rows properly to list of objects
    const data = results.rows.map(row => {
      const item = {};
      results.columns.forEach((col, idx) => {
        item[col] = row[idx];
      });
      return item;
    });

    return res.status(200).json({
      success: true,
      data
    });

  } catch (dbErr) {
    console.error("Turso DB query error:", dbErr);
    return res.status(500).json({ success: false, message: "Database lookup failed." });
  } finally {
    dbClient.close();
  }
};
