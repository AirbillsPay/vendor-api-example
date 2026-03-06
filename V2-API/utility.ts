/**
 * Vendor Gateway API — Utility
 * Lookup and transaction history helpers.
 * Use these before transacting to fetch valid product IDs and amounts,
 * or after to review transaction status.
 */
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.BASE_URL!;
const SECRET_KEY = process.env.SECRET_KEY!;

const headers = {
  "Content-Type": "application/json",
  secretkey: SECRET_KEY,
};

async function get(path: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${path}${query ? `?${query}` : ""}`;
  const res = await fetch(url, { headers });
  return res.json();
}

async function post(path: string, body: object) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

/** Detect phone network before sending airtime or data */
async function checkNetwork(phone: string) {
  const result = await get("/network-checker", { phone });
  console.log("Network:", result.data.network);
  return result;
}

/** List available data/internet plans (batch: "01" or "02") */
async function listInternetPlans(batch: "01" | "02") {
  const result = await get(`/list/internet/${batch}`);
  console.log("Internet plans:", result.data);
  return result;
}

/** List available betting platforms */
async function listBetPlatforms() {
  const result = await get("/list/bet");
  console.log("Betting platforms:", result.data);
  return result;
}

/** List cable TV packages and prices */
async function listCablePackages() {
  const result = await get("/list/cable");
  console.log("Cable packages:", result.data);
  return result;
}

/** List electricity providers (batch: "01" or "02") */
async function listElectProviders(batch: "01" | "02") {
  const result = await get(`/list/elect/${batch}`);
  console.log("Electricity providers:", result.data);
  return result;
}

/** List available transport services */
async function listTransportServices() {
  const result = await get("/list/transport");
  console.log("Transport services:", result.data);
  return result;
}

/** Validate a meter number before purchasing electricity */
async function validateMeter(meterNo: string, electId: string, batch: "01" | "02") {
  const result = await post(`/validate/elect/${batch}`, { meterNo, electId });
  if (result.status === "00") {
    console.log("Meter valid:", result.data);
  } else {
    console.error("Invalid meter:", result.message);
  }
  return result;
}

// ─── History ──────────────────────────────────────────────────────────────────

/** Retrieve all transactions for the vendor by reference name */
async function getAllTransactions(ref: string) {
  const result = await get("/transaction/all", { ref });
  console.log("All transactions:", result.data);
  return result;
}

/** Retrieve a single transaction by its ID */
async function getTransactionById(id: string) {
  const result = await get("/transaction/get", { id });
  console.log("Transaction:", result.data);
  return result;
}

// ─── Run ──────────────────────────────────────────────────────────────────────

(async () => {
  // ── Lookup ──
  await checkNetwork("08012345678");
  // await listInternetPlans("01");
  // await listBetPlatforms();
  // await listCablePackages();
  // await listElectProviders("01");
  // await listTransportServices();
  // await validateMeter("12345678901", "EKEDC", "01");

  // ── History ──
  // await getAllTransactions("your-vendor-ref-name");
  // await getTransactionById("vendor-transaction-uuid");
})();
