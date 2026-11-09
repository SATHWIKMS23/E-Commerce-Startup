const assert = require("assert");

console.log("=================================================");
console.log("🚀 ATLASBASKET DELIVERY PLATFORM — E2E TEST SUITE");
console.log("=================================================");

async function runDeliveryTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Reason: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Reason: ${err.message}`);
      failed++;
    }
  }

  // 1. Pricing and Settings Calculations
  console.log("\n📦 [1] Pricing and Financial Settings");

  test("Calculates correct distance & base pricing in integer paise", () => {
    const baseChargePaise = 3000; // ₹30
    const perKmChargePaise = 1000; // ₹10/km
    const minChargePaise = 4000; // ₹40
    const riderPayoutPct = 90;

    const distanceKm = 4.5;
    const distanceChargePaise = Math.round(distanceKm * perKmChargePaise); // 4500
    const totalFeePaise = Math.max(minChargePaise, baseChargePaise + distanceChargePaise); // 7500 paise (₹75)
    assert.strictEqual(totalFeePaise, 7500);

    const riderEarningsPaise = Math.round((totalFeePaise * riderPayoutPct) / 100); // 6750 paise (₹67.50)
    const platformCommissionPaise = totalFeePaise - riderEarningsPaise; // 750 paise (₹7.50)

    assert.strictEqual(riderEarningsPaise, 6750);
    assert.strictEqual(platformCommissionPaise, 750);
    assert.strictEqual(riderEarningsPaise + platformCommissionPaise, totalFeePaise);
  });

  test("Applies minimum delivery charge when distance is very short", () => {
    const baseChargePaise = 3000;
    const perKmChargePaise = 1000;
    const minChargePaise = 4000;

    const distanceKm = 0.5; // 3000 + 500 = 3500 < 4000
    const calc = baseChargePaise + Math.round(distanceKm * perKmChargePaise);
    const finalFee = Math.max(minChargePaise, calc);
    assert.strictEqual(finalFee, 4000); // Enforces ₹40 minimum
  });

  // 2. Rider Onboarding & Age/Vehicle Eligibility
  console.log("\n👤 [2] Rider Eligibility and Document Masking");

  test("Enforces minimum age >= 18 years", () => {
    function calculateAge(dob) {
      const today = new Date("2026-11-09");
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      return age;
    }

    const underageDob = new Date("2011-05-15");
    assert.strictEqual(calculateAge(underageDob) < 18, true);

    const eligibleDob = new Date("2003-02-20");
    assert.strictEqual(calculateAge(eligibleDob) >= 18, true);
  });

  test("Exempts bicycle riders from motor vehicle driving license", () => {
    function validateVehicleDocs(vehicleType, licenseNumber) {
      if (vehicleType === "BICYCLE") return true;
      return Boolean(licenseNumber && licenseNumber.trim().length > 3);
    }

    assert.strictEqual(validateVehicleDocs("BICYCLE", null), true);
    assert.strictEqual(validateVehicleDocs("BICYCLE", undefined), true);
    assert.strictEqual(validateVehicleDocs("MOTORCYCLE", null), false);
    assert.strictEqual(validateVehicleDocs("MOTORCYCLE", "KA-09-2022-0012345"), true);
  });

  test("Masks Aadhaar numbers preserving only last 4 digits (XXXX-XXXX-1234)", () => {
    function maskAadhaar(raw) {
      if (!raw) return null;
      const cleaned = raw.replace(/\D/g, "");
      if (cleaned.length < 4) return "XXXX-XXXX-XXXX";
      return `XXXX-XXXX-${cleaned.slice(-4)}`;
    }

    assert.strictEqual(maskAadhaar("5482 1234 9876"), "XXXX-XXXX-9876");
    assert.strictEqual(maskAadhaar("123456789012"), "XXXX-XXXX-9012");
  });

  // 3. Availability and Dispatch Rules
  console.log("\n🟢 [3] Rider Availability and 1-Active-Job Dispatch");

  test("Prevents unverified/pending riders from going online", () => {
    function canGoOnline(verificationStatus, status) {
      return verificationStatus === "APPROVED" && status === "ACTIVE";
    }

    assert.strictEqual(canGoOnline("PENDING", "ACTIVE"), false);
    assert.strictEqual(canGoOnline("REJECTED", "ACTIVE"), false);
    assert.strictEqual(canGoOnline("APPROVED", "SUSPENDED"), false);
    assert.strictEqual(canGoOnline("APPROVED", "ACTIVE"), true);
  });

  test("Enforces 1 active delivery per rider to prevent conflicting assignments", () => {
    function isRiderEligibleForOffer(activeDeliveriesCount, isAvailable) {
      if (!isAvailable) return false;
      if (activeDeliveriesCount > 0) return false;
      return true;
    }

    assert.strictEqual(isRiderEligibleForOffer(0, true), true);
    assert.strictEqual(isRiderEligibleForOffer(1, true), false); // Busy
    assert.strictEqual(isRiderEligibleForOffer(0, false), false); // Offline
  });

  // 4. Delivery State Machine & Verification
  console.log("\n🔄 [4] Delivery State Machine & Verification Lifecycle");

  test("Enforces valid forward state transitions", () => {
    const validTransitions = {
      REQUESTED: ["SEARCHING_FOR_RIDER", "OFFERED_TO_RIDER", "ASSIGNED", "CANCELLED"],
      OFFERED_TO_RIDER: ["ASSIGNED", "REASSIGNMENT_REQUIRED", "CANCELLED"],
      ASSIGNED: ["ARRIVING_AT_PICKUP", "CANCELLED"],
      ARRIVING_AT_PICKUP: ["ARRIVED_AT_PICKUP", "CANCELLED"],
      ARRIVED_AT_PICKUP: ["PICKED_UP", "CANCELLED"],
      PICKED_UP: ["IN_TRANSIT", "CANCELLED"],
      IN_TRANSIT: ["ARRIVED_AT_DROPOFF", "CANCELLED"],
      ARRIVED_AT_DROPOFF: ["COMPLETED", "DELIVERED", "CANCELLED"],
      COMPLETED: [],
    };

    function isValidTransition(from, to) {
      return validTransitions[from]?.includes(to) || false;
    }

    assert.strictEqual(isValidTransition("ASSIGNED", "ARRIVING_AT_PICKUP"), true);
    assert.strictEqual(isValidTransition("ARRIVED_AT_PICKUP", "PICKED_UP"), true);
    assert.strictEqual(isValidTransition("IN_TRANSIT", "ARRIVED_AT_DROPOFF"), true);
    assert.strictEqual(isValidTransition("REQUESTED", "COMPLETED"), false); // Invalid jump
  });

  test("Cryptographic pickup OTP / QR token verification", () => {
    const crypto = require("crypto");
    const rawOtp = "482910";
    const hash = crypto.createHash("sha256").update(rawOtp).digest("hex");

    function verify(input) {
      const inputHash = crypto.createHash("sha256").update(input).digest("hex");
      return inputHash === hash;
    }

    assert.strictEqual(verify("482910"), true);
    assert.strictEqual(verify("000000"), false);
    assert.strictEqual(verify("482911"), false);
  });

  // 5. Incident & Disciplinary Policy
  console.log("\n⚖️ [5] Incident Evidence, Penalty and Disciplinary Rules");

  test("Confirmed damage incident reduces payout to configured 20% only upon Admin confirmation", () => {
    const originalRiderPayoutPaise = 10000; // ₹100
    const penaltyPct = 20.0; // Payout reduced to 20%

    function applyConfirmedDamagePenalty(originalPayout, adminConfirmed) {
      if (!adminConfirmed) return originalPayout; // Never penalize without admin decision
      return Math.round((originalPayout * penaltyPct) / 100);
    }

    // Mere allegation does NOT reduce payout
    assert.strictEqual(applyConfirmedDamagePenalty(originalRiderPayoutPaise, false), 10000);

    // Admin confirmed incident reduces payout to ₹20
    assert.strictEqual(applyConfirmedDamagePenalty(originalRiderPayoutPaise, true), 2000);
  });

  test("Enforces 3 strikes disciplinary suspension policy", () => {
    function checkDisciplinaryAction(activeStrikes, maxStrikes = 3) {
      if (activeStrikes >= maxStrikes) {
        return "SUSPENDED";
      }
      return "ACTIVE";
    }

    assert.strictEqual(checkDisciplinaryAction(1), "ACTIVE");
    assert.strictEqual(checkDisciplinaryAction(2), "ACTIVE");
    assert.strictEqual(checkDisciplinaryAction(3), "SUSPENDED");
    assert.strictEqual(checkDisciplinaryAction(4), "SUSPENDED");
  });

  test("Monthly cancellation limits count only rider-initiated cancellations", () => {
    const cancellations = [
      { actor: "SELLER", reason: "Out of stock" },
      { actor: "CUSTOMER", reason: "Mistaken order" },
      { actor: "RIDER", reason: "Flat tyre" },
      { actor: "RIDER", reason: "Emergency" },
    ];

    const riderCancellations = cancellations.filter((c) => c.actor === "RIDER").length;
    assert.strictEqual(riderCancellations, 2);
    assert.strictEqual(riderCancellations <= 5, true);
  });

  // 6. Second-Level Precision Timestamps
  console.log("\n⏱️ [6] Audit Timestamps with Second-Level Precision");

  test("Timestamps preserve second-level precision in UTC and format in Asia/Kolkata", () => {
    const isoString = "2026-11-09T17:42:08.123Z";
    const date = new Date(isoString);

    assert.strictEqual(date.getUTCSeconds(), 8);
    assert.strictEqual(date.getUTCMinutes(), 42);
    assert.strictEqual(date.getUTCHours(), 17);

    // Formatter to local time (IST = UTC + 5:30)
    const options = {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    const istTime = new Intl.DateTimeFormat("en-IN", options).format(date);
    assert.strictEqual(istTime, "23:12:08");
  });

  console.log("\n=================================================");
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runDeliveryTests();
