import { clusterApiUrl, Connection, Keypair, Signer, Transaction } from '@solana/web3.js';
import http from "http";
import dotenv from "dotenv";
import bs58 from 'bs58';

dotenv.config();

if (!process.env.SECRET_KEY) {
  console.error("Missing SECRET_KEY in .env — add your vendor secret key.");
  process.exit(1);
}
if (!process.env.BASE_URL) {
  console.error("Missing BASE_URL in .env — add the API base URL.");
  process.exit(1);
}

const SECRET_KEY = process.env.SECRET_KEY;
const BASE_URL = process.env.BASE_URL;

const headers = {
  "Content-Type": "application/json",
  secretkey: SECRET_KEY,
};

async function post(path: string, body: object) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── Callback server ──────────────────────────────────────────────────────────

const CALLBACK_PORT = 4000;
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;

function startCallbackServer() {
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/callback") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        console.log("\n── Callback received ──────────────────────");
        try {
          console.log(JSON.stringify(JSON.parse(body), null, 2));
        } catch {
          console.log(body);
        }
        console.log("───────────────────────────────────────────\n");
        res.writeHead(200);
        res.end("OK");
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(CALLBACK_PORT, () => {
    console.log(`Callback server listening on ${CALLBACK_URL}`);
  });

  return server;
}

// ─── payWith: "default" ───────────────────────────────────────────────────────

async function airtimeDefault() {
  try {
    // Step 1 — create the transaction
    // Response data shape: { id, transactionIx, token, tokenMint, amountInToken }
    const { data, message } = await post("/transact", {
      productCode: "100",
      payWith: "default",
      callbackUrl: CALLBACK_URL,
      data: {
        pubKey: "9V45GyY9AyMM5kYLzsvTZQfwm6ovzPK6oHXiaJbMCPoA",
        token: "USDT",         // 'USDT' or 'USDC'
        amount: 10000,           // amount in NGN
        phoneNumber: "08012345678",
        networkId: "01",
        fee: 0 // Optional
      },
    });

    console.log("message:", message);
    console.log("Transaction created:", data);
    console.log(`Pay ${data.amountInToken} ${data.token} (mint: ${data.tokenMint})`);

    // Step 2 — deserialize and sign data.transactionIx
    const transaction: Transaction = Transaction.from(
      Buffer.from(data.transactionIx, "base64")
    );

    // ── Backend signing (Keypair) ──────────────────────────────────────────
    // Store your private key as a JSON array in the WALLET_PRIVATE_KEY env var.
    if (!process.env.WALLET_PRIVATE_KEY) {
      throw new Error(
        "WALLET_PRIVATE_KEY is not set in your .env file.\n" +
        "Add your Solana wallet private key:\n" +
        "  WALLET_PRIVATE_KEY=srthrTVfew6657676"
      );
    }
    const signer: Signer = Keypair.fromSecretKey(
      Uint8Array.from(bs58.decode(process.env.WALLET_PRIVATE_KEY))
    );
    transaction.partialSign(signer);

    // ── Frontend signing (wallet adapter) — use this instead of the above ──
    // const signature = await sendTransaction(transaction, connection);

    // Step 3 — submit to Solana and wait for confirmation
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    const signature = await connection.sendRawTransaction(transaction.serialize({ verifySignatures: false }));

    console.log("On-chain tx submitted. Signature:", signature);

    const latest = await connection.getLatestBlockhash({ commitment: "confirmed" });
    const confirmation = await connection.confirmTransaction(
      { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
      "confirmed"
    );

    if (confirmation.value.err) {
      throw new Error("On-chain transaction failed");
    }

    console.log("On-chain transaction confirmed");

    // Step 4 — process (fulfil) the transaction
    const result = await post("/transact/process", {
      productCode: "100",
      id: data.id,
    });

    console.log("Airtime (default) result:", result);
    return result;
  } catch (error: any) {
    console.error("Error:", error?.message ?? error);
    throw error;
  }
}

// ─── payWith: "transfer" ──────────────────────────────────────────────────────
// The API returns a deposit wallet address. The user sends exactly
// amountInToken of token to that wallet on-chain, then call /transact/process.

export async function airtimeTransfer() {
  try {
    // Step 1 — create the transaction
    // Response data shape: { id, wallet, token, tokenMint, amountInToken }
    const { data } = await post("/transact", {
      productCode: "100",
      payWith: "transfer",
      data: {
        pubKey: "",
        token: "USDT",         // 'USDT' or 'USDC'
        amount: 100,           // amount in NGN
        phoneNumber: "08012345678",
        networkId: "01",
      },
    });

    console.log("Transaction created:", data.id);
    console.log(`Send exactly ${data.amountInToken} ${data.token} to ${data.wallet}`);
    console.log(`Token mint: ${data.tokenMint}`);

    // Step 2 — the user sends amountInToken of token to data.wallet on-chain.
    // This is a standard SPL token transfer from the user's wallet to data.wallet.
    //
    // Backend (Keypair):
    // const tx = await createTransferInstruction(senderAta, recipientAta, sender.publicKey, data.amountInToken);
    // const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    // const signature = await sendAndConfirmTransaction(connection, tx, [signer]);
    //
    // Frontend (wallet adapter):
    // const signature = await sendTransaction(tx, connection);

    // Step 3 — once the transfer is confirmed on-chain, process the transaction
    const result = await post("/transact/process", {
      productCode: "100",
      id: data.id,
    });

    console.log("Airtime (transfer) result:", result);
    return result;
  } catch (error: any) {
    console.error("Error:", error?.message ?? error);
    throw error;
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

(async () => {
  const server = startCallbackServer();
  try {
    await airtimeDefault();
    // await airtimeTransfer();
  } finally {
    server.close();
  }
})();
