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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || "champions2026";
  const jwtSecret = process.env.JWT_SECRET || "champions-cup-super-secret-key-2026";

  if (!password) {
    return res.status(400).json({ success: false, message: "Password is required" });
  }

  if (password === adminPassword) {
    // Generate simple JWT token valid for 4 hours
    const token = jwt.sign(
      { admin: true },
      jwtSecret,
      { expiresIn: '4h' }
    );

    return res.status(200).json({
      success: true,
      token
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Incorrect administrative password. Please try again."
    });
  }
};
