/**
 * Vendor Gateway API — Usage Examples
 * Base URL: https://your-api-domain.com
 */
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.BASE_URL!;
const SECRET_KEY = process.env.SECRET_KEY!;

const headers = {
  "Content-Type": "application/json",
  secretkey: SECRET_KEY,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function post(path: string, body: object) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get(path: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${path}${query ? `?${query}` : ""}`;
  const res = await fetch(url, { headers });
  return res.json();
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

/** Detect phone network before sending airtime */
async function checkNetwork(phone: string) {
  return get("/network-checker", { phone });
}

/** List available data plans (batch 01 or 02) */
async function listInternetPlans(batch: "01" | "02") {
  return get(`/list/internet/${batch}`);
}

/** List available betting platforms */
async function listBetPlatforms() {
  return get("/list/bet");
}

/** List cable TV packages */
async function listCablePackages() {
  return get("/list/cable");
}

/** List electricity providers */
async function listElectProviders(batch: "01" | "02") {
  return get(`/list/elect/${batch}`);
}

/** List available transport services */
async function listTransportServices() {
  return get("/list/transport");
}

/** Validate meter number before electricity purchase */
async function validateMeter(meterNo: string, electId: string, batch: "01" | "02") {
  return post(`/validate/elect/${batch}`, { meterNo, electId });
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/** Step 1 — create the transaction, get back an id */
async function createTransaction(payload: object) {
  return post("/transact", payload);
}

/** Step 2 — process/fulfil the pending transaction */
async function processTransaction(productCode: string, id: string) {
  return post("/transact/process", { productCode, id });
}

// ─── History ──────────────────────────────────────────────────────────────────

async function getAllTransactions(ref: string) {
  return get("/transaction/all", { ref });
}

async function getTransactionById(id: string) {
  return get("/transaction/get", { id });
}

// ─── Full Examples ────────────────────────────────────────────────────────────

/** Buy airtime — default (wallet-signed) flow */
async function buyAirtime() {
  const { data } = await createTransaction({
    productCode: "100",
    payWith: "default",
    data: {
      pubKey: "user-wallet-address",
      token: "USDC",
      amount: 500,
      phoneNumber: "08012345678",
      networkId: "01",        // 01=MTN, 02=Glo, 03=9mobile, 04=Airtel
    },
  });
  // data: { id, transactionIx, token, tokenMint, amountInToken }
  // sign data.transactionIx with your wallet before processing
  console.log("Sign tx, then process id:", data.id);

  const result = await processTransaction("100", data.id);
  console.log("Airtime result:", result);
}

/** Buy airtime — transfer (QR/Solana Pay) flow */
async function buyAirtimeTransfer() {
  const { data } = await createTransaction({
    productCode: "100",
    payWith: "transfer",
    data: {
      pubKey: "user-wallet-address",
      token: "USDC",
      amount: 500,
      phoneNumber: "08012345678",
      networkId: "01",        // 01=MTN, 02=Glo, 03=9mobile, 04=Airtel
    },
  });
  // data: { id, wallet, token, tokenMint, amountInToken }
  // send exactly data.amountInToken of data.token to data.wallet
  console.log(`Send ${data.amountInToken} ${data.token} to ${data.wallet}`);

  const result = await processTransaction("100", data.id);
  console.log("Airtime transfer result:", result);
}

/** Buy data plan */
async function buyData() {
  // 1. Pick a plan
  const plans = await listInternetPlans("01");
  const plan = plans.data[0]; // pick the first plan

  const { data } = await createTransaction({
    productCode: "102",
    payWith: "default",
    data: {
      pubKey: "user-wallet-address",
      token: "USDC",
      amount: plan.prodAmount,
      phoneNumber: "08012345678",
      networkId: "01",        // 01=MTN, 02=Glo, 03=9mobile, 04=Airtel
      prodId: plan.prodId,
      batch: "01",
    },
  });
  // data: { id, transactionIx, token, tokenMint, amountInToken }
  // sign data.transactionIx with your wallet before processing

  const result = await processTransaction("102", data.id);
  console.log("Data result:", result);
}

/** Pay electricity bill */
async function payElectricity() {
  // 1. Validate meter
  const validation = await validateMeter("12345678901", "EKEDC", "01");
  if (validation.status !== "00") {
    console.error("Invalid meter:", validation.message);
    return;
  }

  const { data } = await createTransaction({
    productCode: "101",
    payWith: "default",
    data: {
     pubKey: "user-wallet-address",
      token: "USDC",
      amount: 5000,
      meterNo: "12345678901",
      electId: "EKEDC",
      prodId: "prepaid",
      phoneNumber: "08012345678",
      batch: "01",
    },
  });
  // data: { id, transactionIx, token, tokenMint, amountInToken }
  // sign data.transactionIx with your wallet before processing

  const result = await processTransaction("101", data.id);
  console.log("Electricity result:", result);
}

/** Fund betting account */
async function fundBetting() {
  // 1. Pick a platform
  const platforms = await listBetPlatforms();
  const platform = platforms.data[0];

  const { data } = await createTransaction({
    productCode: "103",
    payWith: "default",
    data: {
      pubKey: "user-wallet-address",
      token: "USDC",
      amount: 2000,
      customerId: "USER_BETTING_ID",
      prodId: platform.prodId,
      txId: null,
      txType: null,
      tx_status: null,
    },
  });
  // data: { id, transactionIx, token, tokenMint, amountInToken }
  // sign data.transactionIx with your wallet before processing

  const result = await processTransaction("103", data.id);
  console.log("Betting result:", result);
}

/** Pay cable TV subscription */
async function payCableTV() {
  const packages = await listCablePackages();
  const pkg = packages.data[0];

  const { data } = await createTransaction({
    productCode: "104",
    payWith: "default",
    data: {
      pubKey: "user-wallet-address",
      token: "USDC",
      amount: pkg.prodAmount,
      smartCardNo: "1234567890",
      phoneNumber: "08012345678",
      prodId: pkg.prodId,
      txId: null,
      txType: null,
      tx_status: null,
    },
  });
  // data: { id, transactionIx, token, tokenMint, amountInToken }
  // sign data.transactionIx with your wallet before processing

  const result = await processTransaction("104", data.id);
  console.log("Cable TV result:", result);
}

/** Buy transport ticket */
async function buyTransport() {
  const services = await listTransportServices();
  const service = services.data[0];

  const { data } = await createTransaction({
    productCode: "105",
    payWith: "default",
    data: {
      pubKey: "user-wallet-address",
      token: "USDC",
      amount: service.prodAmount,
      phoneNumber: "08012345678",
      prodId: service.prodId,
    },
  });
  // data: { id, transactionIx, token, tokenMint, amountInToken }
  // sign data.transactionIx with your wallet before processing

  const result = await processTransaction("105", data.id);
  console.log("Transport result:", result);
}
