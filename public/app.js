/* ----------------------------------------------------
   CHAMPIONS CUP - REGISTRATION CLIENT LOGIC
   ---------------------------------------------------- */

// Config & State Variables
const DEADLINE_ISO = "2026-07-08T23:59:00+05:30"; // Deadline: 8 July 2026, 23:59 IST
const REGISTRATION_FEE = 7500;
const UPI_ID = "mubarakk3356@okhdfcbank";
const MERCHANT_NAME = "CHAMPIONS CUP";

let currentStep = 1;
let registrationDeadlinePassed = false;

// File Upload States (Hold Base64 data & info)
let idProofData = { base64: null, name: null, type: null };
let receiptData = { base64: null, name: null, type: null };

document.addEventListener("DOMContentLoaded", () => {
  initCountdown();
  initFormWizard();
  initFileInputs();
  initUPIPayment();
  initFormSubmission();
  initCopyHelper();
});

/* ----------------------------------------------------
   COUNTDOWN TIMER & DEADLINE CHECKS
   ---------------------------------------------------- */
function initCountdown() {
  const targetDate = new Date(DEADLINE_ISO).getTime();
  
  const daysEl = document.getElementById("days");
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");
  const timerContainer = document.getElementById("countdown-timer");
  const closedNotice = document.getElementById("closed-message");
  
  const formContainer = document.getElementById("form-container");
  const closedCard = document.getElementById("registration-closed-card");

  function updateTimer() {
    const now = Date.now();
    const distance = targetDate - now;

    if (distance <= 0) {
      // Deadline passed
      clearInterval(timerInterval);
      registrationDeadlinePassed = true;
      
      // Update UI elements
      if (daysEl) daysEl.innerText = "00";
      if (hoursEl) hoursEl.innerText = "00";
      if (minutesEl) minutesEl.innerText = "00";
      if (secondsEl) secondsEl.innerText = "00";

      timerContainer.classList.add("hidden");
      closedNotice.classList.remove("hidden");

      // Hide Registration Form & Show Closed Banner
      if (formContainer) formContainer.classList.add("hidden");
      if (closedCard) closedCard.classList.remove("hidden");
      
      // Disable hero register CTA button
      const heroRegisterBtn = document.getElementById("btn-hero-register");
      if (heroRegisterBtn) {
        heroRegisterBtn.innerText = "Registrations Closed";
        heroRegisterBtn.style.opacity = "0.7";
        heroRegisterBtn.style.pointerEvents = "none";
      }
      return;
    }

    // Calculations
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Render values
    if (daysEl) daysEl.innerText = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.innerText = String(hours).padStart(2, '0');
    if (minutesEl) minutesEl.innerText = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.innerText = String(seconds).padStart(2, '0');
  }

  // Run immediately and start tick
  updateTimer();
  const timerInterval = setInterval(updateTimer, 1000);
}

/* ----------------------------------------------------
   MULTI-STEP FORM WIZARD
   ---------------------------------------------------- */
function initFormWizard() {
  const nextBtns = document.querySelectorAll(".btn-next");
  const prevBtns = document.querySelectorAll(".btn-prev");
  const formSteps = document.querySelectorAll(".form-step");
  const stepNodes = document.querySelectorAll(".step-node");
  const progressFill = document.getElementById("progress-fill");

  // Next Button handlers
  nextBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (validateStep(currentStep)) {
        goToStep(currentStep + 1);
      } else {
        showToast("Please fix the validation errors in this step.", "error");
      }
    });
  });

  // Previous Button handlers
  prevBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      goToStep(currentStep - 1);
    });
  });

  // Direct Node clicks (only for steps we have already unlocked or filled)
  stepNodes.forEach(node => {
    node.addEventListener("click", () => {
      const targetStep = parseInt(node.getAttribute("data-step"), 10);
      
      // Can only navigate backwards or skip to steps that pass validation
      if (targetStep < currentStep) {
        goToStep(targetStep);
      } else if (targetStep > currentStep) {
        // Must validate sequential steps
        let valid = true;
        for (let s = currentStep; s < targetStep; s++) {
          if (!validateStep(s)) {
            valid = false;
            break;
          }
        }
        if (valid) {
          goToStep(targetStep);
        } else {
          showToast("Fill in required details before advancing.", "error");
        }
      }
    });
  });

  function goToStep(stepNum) {
    if (stepNum < 1 || stepNum > 4) return;
    
    // Deactivate current steps
    formSteps.forEach(step => step.classList.remove("active"));
    stepNodes.forEach(node => {
      const nodeNum = parseInt(node.getAttribute("data-step"), 10);
      node.classList.remove("active");
      if (nodeNum < stepNum) {
        node.classList.add("completed");
      } else {
        node.classList.remove("completed");
      }
    });

    // Activate target step
    currentStep = stepNum;
    document.getElementById(`step-${currentStep}`).classList.add("active");
    document.querySelector(`.step-node[data-step="${currentStep}"]`).classList.add("active");

    // Update progress bar width
    // Step 1 -> 0%, Step 2 -> 33%, Step 3 -> 66%, Step 4 -> 100%
    const progressWidth = ((currentStep - 1) / 3) * 100;
    progressFill.style.width = `${progressWidth}%`;

    // Scroll slightly to top of form
    document.getElementById("form-container").scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ----------------------------------------------------
   CLIENT SIDE FORM VALIDATION
   ---------------------------------------------------- */
function validateStep(step) {
  let isStepValid = true;

  if (step === 1) {
    // Fields lists for Step 1
    const textRequired = [
      "first_name", "last_name", "dob", "gender", "address_line1", 
      "city", "state", "team_name", "eligible_area", "player_role", 
      "batting_hand", "bowling_arm", "bowling_type"
    ];
    
    textRequired.forEach(id => {
      const el = document.getElementById(id);
      if (!el || !el.value || el.value.trim() === "") {
        markInvalid(el);
        isStepValid = false;
      } else {
        markValid(el);
      }
    });

    // Mobile validation
    const mobileEl = document.getElementById("mobile");
    const mobileRegex = /^[6-9]\d{9}$/;
    if (mobileEl) {
      if (!mobileRegex.test(mobileEl.value)) {
        markInvalid(mobileEl);
        isStepValid = false;
      } else {
        markValid(mobileEl);
      }
    }

    // Email validation
    const emailEl = document.getElementById("email");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailEl) {
      if (!emailRegex.test(emailEl.value)) {
        markInvalid(emailEl);
        isStepValid = false;
      } else {
        markValid(emailEl);
      }
    }

    // Postal Code validation
    const pcEl = document.getElementById("postal_code");
    const pcRegex = /^\d{6}$/;
    if (pcEl) {
      if (!pcRegex.test(pcEl.value)) {
        markInvalid(pcEl);
        isStepValid = false;
      } else {
        markValid(pcEl);
      }
    }

  } else if (step === 2) {
    // Step 2: Emergency contacts
    const textRequired = ["emergency_first", "emergency_last"];
    textRequired.forEach(id => {
      const el = document.getElementById(id);
      if (!el || !el.value || el.value.trim() === "") {
        markInvalid(el);
        isStepValid = false;
      } else {
        markValid(el);
      }
    });

    // Emergency mobile validation
    const emMobileEl = document.getElementById("emergency_mobile");
    const mobileRegex = /^[6-9]\d{9}$/;
    if (emMobileEl) {
      if (!mobileRegex.test(emMobileEl.value)) {
        markInvalid(emMobileEl);
        isStepValid = false;
      } else {
        markValid(emMobileEl);
      }
    }

  } else if (step === 3) {
    // Step 3: Document uploading
    const errorEl = document.getElementById("id-upload-error");
    if (!idProofData.base64) {
      if (errorEl) errorEl.style.display = "block";
      document.getElementById("id-upload-box").style.borderColor = "var(--color-error)";
      isStepValid = false;
    } else {
      if (errorEl) errorEl.style.display = "none";
      document.getElementById("id-upload-box").style.borderColor = "rgba(245, 166, 35, 0.3)";
    }

  } else if (step === 4) {
    // Step 4: Receipt uploading
    const errorEl = document.getElementById("receipt-upload-error");
    if (!receiptData.base64) {
      if (errorEl) errorEl.style.display = "block";
      document.getElementById("receipt-upload-box").style.borderColor = "var(--color-error)";
      isStepValid = false;
    } else {
      if (errorEl) errorEl.style.display = "none";
      document.getElementById("receipt-upload-box").style.borderColor = "rgba(245, 166, 35, 0.3)";
    }
  }

  return isStepValid;
}

function markInvalid(element) {
  if (element && element.parentElement) {
    element.parentElement.classList.add("invalid");
  }
}

function markValid(element) {
  if (element && element.parentElement) {
    element.parentElement.classList.remove("invalid");
  }
}

/* ----------------------------------------------------
   FILE INPUT & BASE64 PREVIEW PROCESSING
   ---------------------------------------------------- */
function initFileInputs() {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
  
  // ID PROOF ELEMENTS
  const idFileInput = document.getElementById("id_proof_file");
  const idUploadBox = document.getElementById("id-upload-box");
  const idPreviewPanel = document.getElementById("id-preview-panel");
  const idFileName = document.getElementById("id-file-name");
  const idFileSize = document.getElementById("id-file-size");
  const idImgPreview = document.getElementById("id-img-preview");
  const idPdfPreview = document.getElementById("id-pdf-preview");
  const idRemoveBtn = document.getElementById("btn-remove-id");

  // RECEIPT ELEMENTS
  const receiptFileInput = document.getElementById("receipt_file");
  const receiptUploadBox = document.getElementById("receipt-upload-box");
  const receiptPreviewPanel = document.getElementById("receipt-preview-panel");
  const receiptFileName = document.getElementById("receipt-file-name");
  const receiptFileSize = document.getElementById("receipt-file-size");
  const receiptImgPreview = document.getElementById("receipt-img-preview");
  const receiptRemoveBtn = document.getElementById("btn-remove-receipt");

  // ID File changes
  idFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      showToast("ID proof file size exceeds the 5MB limit.", "error");
      idFileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
      idProofData.base64 = evt.target.result;
      idProofData.name = file.name;
      idProofData.type = file.type;

      // Populate file metrics
      idFileName.innerText = file.name;
      idFileSize.innerText = formatBytes(file.size);

      // Render Image or PDF Indicator
      if (file.type.startsWith("image/")) {
        idImgPreview.src = evt.target.result;
        idImgPreview.classList.remove("hidden");
        idPdfPreview.classList.add("hidden");
      } else if (file.type === "application/pdf") {
        idImgPreview.classList.add("hidden");
        idPdfPreview.classList.remove("hidden");
      }

      idUploadBox.classList.add("hidden");
      idPreviewPanel.classList.remove("hidden");
      
      // Hide error msg if showing
      document.getElementById("id-upload-error").style.display = "none";
    };
    reader.readAsDataURL(file);
  });

  // ID file removal
  idRemoveBtn.addEventListener("click", () => {
    idFileInput.value = "";
    idProofData = { base64: null, name: null, type: null };
    idUploadBox.classList.remove("hidden");
    idPreviewPanel.classList.add("hidden");
    idImgPreview.src = "#";
  });

  // Receipt File changes
  receiptFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      showToast("Receipt file size exceeds the 5MB limit.", "error");
      receiptFileInput.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (JPEG or PNG) for the receipt screenshot.", "error");
      receiptFileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
      receiptData.base64 = evt.target.result;
      receiptData.name = file.name;
      receiptData.type = file.type;

      // Populate elements
      receiptFileName.innerText = file.name;
      receiptFileSize.innerText = formatBytes(file.size);

      receiptImgPreview.src = evt.target.result;
      receiptImgPreview.classList.remove("hidden");

      receiptUploadBox.classList.add("hidden");
      receiptPreviewPanel.classList.remove("hidden");
      
      // Hide error msg if showing
      document.getElementById("receipt-upload-error").style.display = "none";
    };
    reader.readAsDataURL(file);
  });

  // Receipt file removal
  receiptRemoveBtn.addEventListener("click", () => {
    receiptFileInput.value = "";
    receiptData = { base64: null, name: null, type: null };
    receiptUploadBox.classList.remove("hidden");
    receiptPreviewPanel.classList.add("hidden");
    receiptImgPreview.src = "#";
  });
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/* ----------------------------------------------------
   UPI PAYMENT QR & DEEP LINKS
   ---------------------------------------------------- */
function initUPIPayment() {
  const upiUrl = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${REGISTRATION_FEE}&cu=INR`;
  
  const qrContainer = document.getElementById("qrcode");
  if (qrContainer) {
    // Generate QR code (qrcode.js library loads from CDN in index.html)
    new QRCode(qrContainer, {
      text: upiUrl,
      width: 160,
      height: 160,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  }
}

/* ----------------------------------------------------
   FORM SUBMISSION
   ---------------------------------------------------- */
function initFormSubmission() {
  const form = document.getElementById("registration-form");
  const loader = document.getElementById("submit-loader");
  const successModal = document.getElementById("success-modal");
  const successRegId = document.getElementById("success-reg-id");
  const closeSuccessBtn = document.getElementById("btn-close-success");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Final Validation check
    if (!validateStep(4)) {
      showToast("Please upload your payment receipt.", "error");
      return;
    }

    // Safety deadline checks
    if (registrationDeadlinePassed) {
      showToast("Registrations are closed. Form submission rejected.", "error");
      return;
    }

    // Open Loader overlay
    loader.classList.remove("hidden");

    // Gather Form inputs
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      // Do not append raw file objects to standard fields
      if (key !== "id_proof_file" && key !== "receipt_file") {
        data[key] = value;
      }
    });

    // Append Base64 files
    data.id_proof = idProofData;
    data.payment_receipt = receiptData;

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Success
        loader.classList.add("hidden");
        
        // Show success modal with Registration ID
        successRegId.innerText = result.registrationId;
        successModal.classList.remove("hidden");

        // Reset Form & upload states
        form.reset();
        document.getElementById("btn-remove-id").click();
        document.getElementById("btn-remove-receipt").click();
        
        // Return wizard to Step 1
        currentStep = 1;
        document.querySelectorAll(".form-step").forEach(step => step.classList.remove("active"));
        document.getElementById("step-1").classList.add("active");
        
        document.querySelectorAll(".step-node").forEach(node => {
          node.classList.remove("active", "completed");
        });
        document.querySelector('.step-node[data-step="1"]').classList.add("active");
        document.getElementById("progress-fill").style.width = "0%";
      } else {
        throw new Error(result.message || "Registration failed. Please try again.");
      }

    } catch (err) {
      loader.classList.add("hidden");
      showToast(err.message, "error");
    }
  });

  // Close Success Modal button
  if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener("click", () => {
      successModal.classList.add("hidden");
      // Scroll to hero
      document.getElementById("hero").scrollIntoView({ behavior: 'smooth' });
    });
  }
}

/* ----------------------------------------------------
   UI HELPERS: COPY TO CLIPBOARD & TOASTS
   ---------------------------------------------------- */
function initCopyHelper() {
  const upiBadge = document.getElementById("upi-address");
  if (upiBadge) {
    upiBadge.addEventListener("click", () => {
      navigator.clipboard.writeText(upiBadge.innerText)
        .then(() => {
          showToast("UPI ID copied to clipboard!", "success");
        })
        .catch(() => {
          showToast("Failed to copy UPI ID.", "error");
        });
    });
  }
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  // Custom Icon based on type
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

  // Close toast on button click
  toast.querySelector(".toast-close-btn").addEventListener("click", () => {
    toast.remove();
  });

  // Auto remove after 4.5 seconds
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s reverse forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4500);
}
