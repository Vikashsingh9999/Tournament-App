/* ----------------------------------------------------
   CHAMPIONS CUP - ADMIN CONTROLLER LOGIC
   ---------------------------------------------------- */

let registrationsList = [];
let filteredList = [];

document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  initLogin();
  initLogout();
  initFilters();
  initModal();
  initExport();
});

/* ----------------------------------------------------
   SESSION VERIFICATION
   ---------------------------------------------------- */
function checkSession() {
  const token = localStorage.getItem("admin_token");
  const loginSection = document.getElementById("login-section");
  const dashboardSection = document.getElementById("dashboard-section");
  const logoutBtn = document.getElementById("btn-logout");

  if (token) {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    fetchRegistrations();
  } else {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
    logoutBtn.classList.add("hidden");
  }
}

/* ----------------------------------------------------
   ADMIN LOGIN PROCESS
   ---------------------------------------------------- */
function initLogin() {
  const loginForm = document.getElementById("login-form");
  const loader = document.getElementById("admin-loader");

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("admin-password").value;

    loader.classList.remove("hidden");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });

      const result = await response.json();
      loader.classList.add("hidden");

      if (response.ok && result.success) {
        localStorage.setItem("admin_token", result.token);
        showToast("Authentication successful!", "success");
        checkSession();
      } else {
        throw new Error(result.message || "Invalid password.");
      }
    } catch (err) {
      loader.classList.add("hidden");
      showToast(err.message, "error");
    }
  });
}

/* ----------------------------------------------------
   LOGOUT PROCESS
   ---------------------------------------------------- */
function initLogout() {
  const logoutBtn = document.getElementById("btn-logout");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("admin_token");
    showToast("Logged out successfully.", "info");
    checkSession();
  });
}

/* ----------------------------------------------------
   FETCHING DATABASE RECORDS
   ---------------------------------------------------- */
async function fetchRegistrations() {
  const token = localStorage.getItem("admin_token");
  const loader = document.getElementById("admin-loader");
  
  if (!token) return;
  loader.classList.remove("hidden");

  try {
    const response = await fetch("/api/admin/registrations", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (response.status === 401 || response.status === 403) {
      // Token expired or invalid
      localStorage.removeItem("admin_token");
      checkSession();
      throw new Error("Session expired. Please log in again.");
    }

    const result = await response.json();
    loader.classList.add("hidden");

    if (response.ok && result.success) {
      registrationsList = result.data || [];
      populateTeamFilter(registrationsList);
      updateStats(registrationsList);
      applyFilters(); // Renders the table
    } else {
      throw new Error(result.message || "Failed to fetch registrations.");
    }

  } catch (err) {
    loader.classList.add("hidden");
    showToast(err.message, "error");
  }
}

/* ----------------------------------------------------
   POPULATE TEAM FILTER DROPDOWN
   ---------------------------------------------------- */
function populateTeamFilter(list) {
  const teamFilter = document.getElementById("filter-team");
  if (!teamFilter) return;

  // Extract unique team names
  const teams = [...new Set(list.map(reg => reg.team_name.trim()))].sort();
  
  // Clear previous options except first "All Teams"
  teamFilter.innerHTML = '<option value="">All Teams</option>';
  
  teams.forEach(team => {
    const option = document.createElement("option");
    option.value = team;
    option.innerText = team;
    teamFilter.appendChild(option);
  });
}

/* ----------------------------------------------------
   ANALYTICS SUMMARY CALCULATIONS
   ---------------------------------------------------- */
function updateStats(list) {
  const totalCountEl = document.getElementById("stat-total-count");
  const totalFeesEl = document.getElementById("stat-total-fees");
  const distributionEl = document.getElementById("stat-role-distribution");

  const totalCount = list.length;
  const totalFees = totalCount * 7500;

  let bowlers = 0;
  let batsmen = 0;
  let allRounders = 0;
  let wicketKeepers = 0;

  list.forEach(player => {
    const role = player.player_role.toLowerCase();
    if (role.includes("bowler")) bowlers++;
    else if (role.includes("wicketkeeper")) wicketKeepers++;
    else if (role.includes("batsman")) batsmen++;
    else if (role.includes("all-rounder")) allRounders++;
  });

  if (totalCountEl) totalCountEl.innerText = totalCount;
  if (totalFeesEl) totalFeesEl.innerText = `₹${totalFees.toLocaleString('en-IN')}`;
  if (distributionEl) {
    distributionEl.innerHTML = `
      Bat: ${batsmen} &nbsp;|&nbsp; 
      Bowl: ${bowlers} &nbsp;|&nbsp; 
      AR: ${allRounders} &nbsp;|&nbsp; 
      WK: ${wicketKeepers}
    `;
  }
}

/* ----------------------------------------------------
   FILTERING AND TABLE RENDER LOGIC
   ---------------------------------------------------- */
function initFilters() {
  const searchInput = document.getElementById("search-input");
  const filterTeam = document.getElementById("filter-team");
  const filterArea = document.getElementById("filter-area");

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (filterTeam) filterTeam.addEventListener("change", applyFilters);
  if (filterArea) filterArea.addEventListener("change", applyFilters);
}

function applyFilters() {
  const searchVal = document.getElementById("search-input").value.toLowerCase().trim();
  const teamVal = document.getElementById("filter-team").value;
  const areaVal = document.getElementById("filter-area").value;

  filteredList = registrationsList.filter(reg => {
    // 1. Search Query Match
    const matchesSearch = !searchVal || 
      reg.id.toLowerCase().includes(searchVal) ||
      reg.first_name.toLowerCase().includes(searchVal) ||
      reg.last_name.toLowerCase().includes(searchVal) ||
      reg.email.toLowerCase().includes(searchVal) ||
      reg.mobile.includes(searchVal) ||
      reg.team_name.toLowerCase().includes(searchVal);

    // 2. Team Match
    const matchesTeam = !teamVal || reg.team_name === teamVal;

    // 3. Area Match
    const matchesArea = !areaVal || reg.eligible_area === areaVal;

    return matchesSearch && matchesTeam && matchesArea;
  });

  renderTable(filteredList);
}

function renderTable(list) {
  const tbody = document.getElementById("table-body");
  const emptyView = document.getElementById("no-records-view");
  const table = document.getElementById("registrations-table");

  if (!tbody) return;

  tbody.innerHTML = "";

  if (list.length === 0) {
    table.classList.add("hidden");
    emptyView.classList.remove("hidden");
    return;
  }

  table.classList.remove("hidden");
  emptyView.classList.add("hidden");

  list.forEach(reg => {
    const tr = document.createElement("tr");
    
    // Format Name
    const middleNameText = reg.middle_name ? ` ${reg.middle_name}` : '';
    const fullName = `${reg.first_name}${middleNameText} ${reg.last_name}`;

    // Bowling style text summary
    let bowlingSummary = reg.bowling_arm;
    if (reg.bowling_type && reg.bowling_type !== "N/A") {
      bowlingSummary += ` (${reg.bowling_type})`;
    }

    // Payment Status badge: If url exists, paid
    const statusText = reg.payment_receipt_url ? "PAID" : "UNPAID";
    const statusClass = reg.payment_receipt_url ? "paid" : "unpaid";

    // Format Date
    const dateFormatted = reg.created_at ? new Date(reg.created_at).toLocaleDateString('en-IN') : 'N/A';

    tr.innerHTML = `
      <td><strong class="gold-text">${reg.id}</strong></td>
      <td>${fullName}</td>
      <td>${reg.mobile}</td>
      <td>${reg.team_name}</td>
      <td>${reg.player_role}</td>
      <td>Bat: ${reg.batting_hand}<br>Bowl: ${bowlingSummary}</td>
      <td>${reg.eligible_area}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>${dateFormatted}</td>
    `;

    // Click handler to open details
    tr.addEventListener("click", () => {
      openDetailsModal(reg);
    });

    tbody.appendChild(tr);
  });
}

/* ----------------------------------------------------
   DETAILS MODAL DISPLAY
   ---------------------------------------------------- */
function initModal() {
  const modal = document.getElementById("details-modal");
  const closeBtn = document.getElementById("btn-close-details");

  if (!modal || !closeBtn) return;

  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));

  // Close when clicking outside content area
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
    }
  });
}

function openDetailsModal(player) {
  const modal = document.getElementById("details-modal");
  if (!modal) return;

  // Set fields
  const middleNameText = player.middle_name ? ` ${player.middle_name}` : '';
  document.getElementById("det-id").innerText = player.id;
  document.getElementById("det-name").innerText = `${player.first_name}${middleNameText} ${player.last_name} (${player.gender})`;
  document.getElementById("det-dob").innerText = player.dob;
  document.getElementById("det-gender").innerText = player.gender;
  document.getElementById("det-mobile").innerText = player.mobile;
  document.getElementById("det-email").innerText = player.email;
  document.getElementById("det-address").innerText = `${player.address_line1}${player.address_line2 ? ', ' + player.address_line2 : ''}, ${player.city}, ${player.state} - ${player.postal_code}`;
  document.getElementById("det-team").innerText = player.team_name;
  document.getElementById("det-area").innerText = player.eligible_area;
  document.getElementById("det-role").innerText = player.player_role;
  
  // Style summary
  let styleText = `Batting: ${player.batting_hand}`;
  if (player.bowling_arm && player.bowling_arm !== "N/A") {
    styleText += ` | Bowling: ${player.bowling_arm} (${player.bowling_type})`;
  } else {
    styleText += ` | Bowling: N/A`;
  }
  document.getElementById("det-style").innerText = styleText;

  document.getElementById("det-emergency").innerText = `${player.emergency_first} ${player.emergency_last} (Mobile: ${player.emergency_mobile})`;
  document.getElementById("det-medical").innerText = player.medical_conditions || "None declared";

  // Previews Setup
  const idImg = document.getElementById("det-id-img");
  const idPdf = document.getElementById("det-id-pdf");
  const idDl = document.getElementById("det-id-download");

  const receiptImg = document.getElementById("det-receipt-img");
  const receiptDl = document.getElementById("det-receipt-download");

  // ID Proof display
  if (player.id_proof_url) {
    idDl.href = player.id_proof_url;
    idDl.classList.remove("hidden");

    // Check if it's pdf via url naming or let Cloudinary handle
    if (player.id_proof_url.toLowerCase().endsWith(".pdf")) {
      idImg.classList.add("hidden");
      idPdf.classList.remove("hidden");
    } else {
      idImg.src = player.id_proof_url;
      idImg.classList.remove("hidden");
      idPdf.classList.add("hidden");
    }
  } else {
    idImg.classList.add("hidden");
    idPdf.classList.add("hidden");
    idDl.classList.add("hidden");
  }

  // Receipt display
  if (player.payment_receipt_url) {
    receiptImg.src = player.payment_receipt_url;
    receiptImg.classList.remove("hidden");
    receiptDl.href = player.payment_receipt_url;
    receiptDl.classList.remove("hidden");
  } else {
    receiptImg.classList.add("hidden");
    receiptDl.classList.add("hidden");
  }

  // Open modal
  modal.classList.remove("hidden");
}

/* ----------------------------------------------------
   EXCEL FILE EXPORT STEAM
   ---------------------------------------------------- */
function initExport() {
  const exportBtn = document.getElementById("btn-export-excel");
  const loader = document.getElementById("admin-loader");

  if (!exportBtn) return;

  exportBtn.addEventListener("click", async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    loader.classList.remove("hidden");
    document.getElementById("admin-loader-title").innerText = "Generating Excel Spreadsheet...";

    try {
      const response = await fetch("/api/admin/export", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("admin_token");
        checkSession();
        throw new Error("Session expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error("Failed to export Excel file.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Champions_Cup_Season_1_Registrations_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      
      // cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      loader.classList.add("hidden");
      document.getElementById("admin-loader-title").innerText = "Loading Dashboard Data...";
      showToast("Spreadsheet downloaded successfully!", "success");

    } catch (err) {
      loader.classList.add("hidden");
      document.getElementById("admin-loader-title").innerText = "Loading Dashboard Data...";
      showToast(err.message, "error");
    }
  });
}

/* ----------------------------------------------------
   UI HELPER: TOAST MESSAGES
   ---------------------------------------------------- */
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  let icon = "";
  if (type === "success") {
    icon = `<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--color-success);"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
  } else if (type === "error") {
    icon = `<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--color-error);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
  } else {
    icon = `<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--color-info);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
  }

  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
    <button class="toast-close-btn">&times;</button>
  `;

  container.appendChild(toast);

  toast.querySelector(".toast-close-btn").addEventListener("click", () => {
    toast.remove();
  });

  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s reverse forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4500);
}
