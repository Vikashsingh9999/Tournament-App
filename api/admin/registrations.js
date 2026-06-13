const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const FILE_PATH = path.join(process.cwd(), 'registrations.json');

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

  // 2. Read registrations from local JSON file
  try {
    let registrations = [];
    if (fs.existsSync(FILE_PATH)) {
      const fileContent = fs.readFileSync(FILE_PATH, 'utf8');
      registrations = JSON.parse(fileContent);
    }

    return res.status(200).json({
      success: true,
      data: registrations
    });

  } catch (err) {
    console.error("Local file query registrations error:", err);
    return res.status(500).json({ success: false, message: "Failed to read database records." });
  }
};
