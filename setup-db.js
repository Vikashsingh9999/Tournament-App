require('dotenv').config();
const { createClient } = require('@libsql/client');

async function setup() {
  const url = process.env.LIBSQL_DB_URL;
  const authToken = process.env.LIBSQL_DB_AUTH_TOKEN;

  if (!url) {
    console.error("Error: LIBSQL_DB_URL is not set in environment variables.");
    console.log("Please create a .env file with LIBSQL_DB_URL and LIBSQL_DB_AUTH_TOKEN to run this script locally.");
    process.exit(1);
  }

  console.log(`Connecting to Turso database: ${url}`);
  const client = createClient({ url, authToken });

  try {
    console.log("Creating 'registrations' table if it does not exist...");
    await client.execute(`
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
        batting_hand TEXT NOT NULL,   -- "Left Hand" or "Right Hand"
        bowling_arm TEXT NOT NULL,    -- "Left Arm", "Right Arm", "N/A"
        bowling_type TEXT NOT NULL,   -- "Fast", "Medium Pace", "Off Spin", "Leg Spin", "Left-Arm Orthodox", "Left-Arm Unorthodox", "N/A"
        emergency_first TEXT NOT NULL,
        emergency_last TEXT NOT NULL,
        emergency_mobile TEXT NOT NULL,
        id_proof_url TEXT,            -- URL from Cloudinary
        medical_conditions TEXT,
        payment_receipt_url TEXT,     -- URL from Cloudinary
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    console.log("Database table 'registrations' created or verified successfully!");
  } catch (error) {
    console.error("Database setup failed:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

setup();
