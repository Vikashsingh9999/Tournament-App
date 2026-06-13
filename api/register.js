const { createClient } = require('@libsql/client');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const DEADLINE_ISO = "2026-07-08T23:59:00+05:30";

module.exports = async (req, res) => {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  // 1. Validate Deadline
  const deadlineTime = new Date(DEADLINE_ISO).getTime();
  if (Date.now() > deadlineTime) {
    return res.status(400).json({ success: false, message: "Registration deadline has passed (July 8, 2026 23:59 IST)." });
  }

  const {
    first_name,
    middle_name,
    last_name,
    dob,
    gender,
    mobile,
    email,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    team_name,
    eligible_area,
    player_role,
    batting_hand,
    bowling_arm,
    bowling_type,
    emergency_first,
    emergency_last,
    emergency_mobile,
    id_proof, // { base64, name, type }
    medical_conditions,
    payment_receipt // { base64, name, type }
  } = req.body;

  // Simple validation check
  if (!first_name || !last_name || !dob || !gender || !mobile || !email || 
      !address_line1 || !city || !state || !postal_code || !team_name || 
      !eligible_area || !player_role || !batting_hand || !bowling_arm || 
      !bowling_type || !emergency_first || !emergency_last || !emergency_mobile ||
      !id_proof || !id_proof.base64 || !payment_receipt || !payment_receipt.base64) {
    return res.status(400).json({ success: false, message: "Missing required fields or uploaded documents." });
  }

  const dbUrl = process.env.LIBSQL_DB_URL;
  const dbAuthToken = process.env.LIBSQL_DB_AUTH_TOKEN;

  if (!dbUrl) {
    return res.status(500).json({ success: false, message: "Server configuration error: Database URL not set." });
  }

  const dbClient = createClient({ url: dbUrl, authToken: dbAuthToken });

  try {
    // 2. Auto Create Table on first run if it doesn't exist
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS registrations (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        last_name TEXT NOT NULL,
        dob TEXT NOT NULL,
        gender TEXT NOT NULL,
        mobile TEXT NOT NULL,
        email TEXT NOT NULL,
        address_line1 TEXT NOT NULL,
        address_line2 TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        postal_code TEXT NOT NULL,
        team_name TEXT NOT NULL,
        eligible_area TEXT NOT NULL,
        player_role TEXT NOT NULL,
        batting_hand TEXT NOT NULL,
        bowling_arm TEXT NOT NULL,
        bowling_type TEXT NOT NULL,
        emergency_first TEXT NOT NULL,
        emergency_last TEXT NOT NULL,
        emergency_mobile TEXT NOT NULL,
        id_proof_url TEXT,            -- Holds raw Base64 data URL
        medical_conditions TEXT,
        payment_receipt_url TEXT,     -- Holds raw Base64 data URL
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 3. Compute unique registration ID: CC-001, CC-002, etc.
    const lastRegResult = await dbClient.execute("SELECT id FROM registrations ORDER BY ROWID DESC LIMIT 1");
    let nextNum = 1;
    if (lastRegResult.rows.length > 0) {
      const lastId = lastRegResult.rows[0].id;
      const match = lastId.match(/CC-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const registrationId = `CC-${String(nextNum).padStart(3, '0')}`;

    // 4. Save Base64 directly (no Cloudinary required)
    const idProofUrl = id_proof.base64;
    const paymentReceiptUrl = payment_receipt.base64;

    // 5. Insert details into Turso DB
    await dbClient.execute({
      sql: `INSERT INTO registrations (
        id, first_name, middle_name, last_name, dob, gender, mobile, email,
        address_line1, address_line2, city, state, postal_code, team_name,
        eligible_area, player_role, batting_hand, bowling_arm, bowling_type,
        emergency_first, emergency_last, emergency_mobile, id_proof_url,
        medical_conditions, payment_receipt_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        registrationId,
        first_name.trim(),
        middle_name ? middle_name.trim() : null,
        last_name.trim(),
        dob,
        gender,
        mobile.trim(),
        email.trim(),
        address_line1.trim(),
        address_line2 ? address_line2.trim() : null,
        city.trim(),
        state.trim(),
        postal_code.trim(),
        team_name.trim(),
        eligible_area,
        player_role,
        batting_hand,
        bowling_arm,
        bowling_type,
        emergency_first.trim(),
        emergency_last.trim(),
        emergency_mobile.trim(),
        idProofUrl,
        medical_conditions ? medical_conditions.trim() : null,
        paymentReceiptUrl
      ]
    });

    return res.status(200).json({
      success: true,
      message: "Registration completed successfully.",
      registrationId
    });

  } catch (dbErr) {
    console.error("Turso database execution error:", dbErr);
    return res.status(500).json({ success: false, message: "Internal Server Error: Database transaction failed." });
  } finally {
    dbClient.close();
  }
};
