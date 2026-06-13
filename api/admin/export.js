const { createClient } = require('@libsql/client');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');

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

  // 2. Query Registrations from Turso DB
  const dbUrl = process.env.LIBSQL_DB_URL;
  const dbAuthToken = process.env.LIBSQL_DB_AUTH_TOKEN;

  if (!dbUrl) {
    return res.status(500).json({ success: false, message: "Server configuration error: Database URL not set." });
  }

  const dbClient = createClient({ url: dbUrl, authToken: dbAuthToken });

  try {
    const tableCheck = await dbClient.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='registrations'");
    
    let registrations = [];
    if (tableCheck.rows.length > 0) {
      const results = await dbClient.execute("SELECT * FROM registrations ORDER BY created_at ASC");
      
      registrations = results.rows.map(row => {
        const item = {};
        results.columns.forEach((col, idx) => {
          item[col] = row[idx];
        });
        return item;
      });
    }

    // 3. Format Data rows for sheet (summarize base64 files to keep Excel file size lightweight)
    const sheetData = registrations.map(reg => {
      const middleNameText = reg.middle_name ? ` ${reg.middle_name}` : '';
      
      let idProofDesc = "No File";
      if (reg.id_proof_url) {
        idProofDesc = reg.id_proof_url.startsWith("data:application/pdf") ? "Base64 PDF Document" : "Base64 Image Document";
      }

      let receiptDesc = reg.payment_receipt_url ? "Base64 Screenshot Image" : "No File";

      return {
        "Registration ID": reg.id,
        "First Name": reg.first_name,
        "Middle Name": reg.middle_name || "",
        "Last Name": reg.last_name,
        "Date of Birth": reg.dob,
        "Gender": reg.gender,
        "Mobile Number": reg.mobile,
        "Email": reg.email,
        "Address Line 1": reg.address_line1,
        "Address Line 2": reg.address_line2 || "",
        "City": reg.city,
        "State": reg.state,
        "Postal Code": reg.postal_code,
        "Team Name": reg.team_name,
        "Eligible Region": reg.eligible_area,
        "Playing Role": reg.player_role,
        "Batting Style": reg.batting_hand,
        "Bowling Arm": reg.bowling_arm,
        "Bowling Type": reg.bowling_type,
        "Emergency Contact Name": `${reg.emergency_first} ${reg.emergency_last}`,
        "Emergency Contact Mobile": reg.emergency_mobile,
        "Medical Notes": reg.medical_conditions || "None Declared",
        "ID Proof File": idProofDesc,
        "Payment Receipt File": receiptDesc,
        "Registration Date": reg.created_at ? new Date(reg.created_at).toLocaleString('en-IN') : 'N/A'
      };
    });

    // 4. Generate Workbook buffer using SheetJS
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    
    // Set column widths dynamically for readability
    const maxValLength = (val) => String(val || "").length;
    const colWidths = [];
    if (sheetData.length > 0) {
      const headers = Object.keys(sheetData[0]);
      headers.forEach((header, idx) => {
        let max = header.length;
        sheetData.forEach(row => {
          const valLen = maxValLength(row[header]);
          if (valLen > max) max = valLen;
        });
        colWidths[idx] = { wch: Math.min(max + 2, 40) }; // Cap width at 40 chars max
      });
      worksheet['!cols'] = colWidths;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 5. Send xlsx Buffer response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Champions_Cup_Season_1_Registrations.xlsx"');
    
    return res.status(200).send(excelBuffer);

  } catch (err) {
    console.error("Turso database query export error:", err);
    return res.status(500).json({ success: false, message: "Export failed due to server error." });
  } finally {
    dbClient.close();
  }
};
