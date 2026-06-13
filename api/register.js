const fs = require('fs');
const path = require('path');

const DEADLINE_ISO = "2026-07-08T23:59:00+05:30";
const FILE_PATH = path.join(process.cwd(), 'registrations.json');

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

  // Validate fields
  if (!first_name || !last_name || !dob || !gender || !mobile || !email || 
      !address_line1 || !city || !state || !postal_code || !team_name || 
      !eligible_area || !player_role || !batting_hand || !bowling_arm || 
      !bowling_type || !emergency_first || !emergency_last || !emergency_mobile ||
      !id_proof || !id_proof.base64 || !payment_receipt || !payment_receipt.base64) {
    return res.status(400).json({ success: false, message: "Missing required fields or uploaded documents." });
  }

  try {
    // 2. Read existing registrations list from JSON file
    let registrations = [];
    if (fs.existsSync(FILE_PATH)) {
      try {
        const fileContent = fs.readFileSync(FILE_PATH, 'utf8');
        registrations = JSON.parse(fileContent);
      } catch (parseErr) {
        console.error("Error parsing registrations.json, starting empty:", parseErr);
        registrations = [];
      }
    }

    // 3. Generate sequential registration ID (CC-001, CC-002, etc.)
    let nextNum = 1;
    if (registrations.length > 0) {
      const ids = registrations.map(r => {
        const match = r.id.match(/CC-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
      nextNum = Math.max(...ids) + 1;
    }
    const registrationId = `CC-${String(nextNum).padStart(3, '0')}`;

    // 4. Create new participant object storing base64 strings directly in URL properties
    const newRegistration = {
      id: registrationId,
      first_name: first_name.trim(),
      middle_name: middle_name ? middle_name.trim() : null,
      last_name: last_name.trim(),
      dob,
      gender,
      mobile: mobile.trim(),
      email: email.trim(),
      address_line1: address_line1.trim(),
      address_line2: address_line2 ? address_line2.trim() : null,
      city: city.trim(),
      state: state.trim(),
      postal_code: postal_code.trim(),
      team_name: team_name.trim(),
      eligible_area,
      player_role,
      batting_hand,
      bowling_arm,
      bowling_type,
      emergency_first: emergency_first.trim(),
      emergency_last: emergency_last.trim(),
      emergency_mobile: emergency_mobile.trim(),
      id_proof_url: id_proof.base64, // Directly save Base64 data URL
      medical_conditions: medical_conditions ? medical_conditions.trim() : null,
      payment_receipt_url: payment_receipt.base64, // Directly save Base64 data URL
      created_at: new Date().toISOString()
    };

    // 5. Append and write back to file
    registrations.push(newRegistration);
    fs.writeFileSync(FILE_PATH, JSON.stringify(registrations, null, 2), 'utf8');

    return res.status(200).json({
      success: true,
      message: "Registration completed successfully.",
      registrationId
    });

  } catch (err) {
    console.error("Local file database execution error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error: Failed to write to JSON database." });
  }
};
